package com.cultofbits.customizations.workflow

import com.cultofbits.integrationm.service.actionpack.RecordmActionPack
import com.cultofbits.integrationm.service.dictionary.recordm.RecordmSearchHit

class WorkItemStateHandler {

    private final RecordmActionPack recordmAp
    private final Object log

    def WorkItemStateHandler(recordmAp, log) {
        this.recordmAp = recordmAp
        this.log = log
    }

    /**
     * move a list of work items to Done
     * @return a list of Maps holding the result for each of the work items
     */
    List complete(List<Integer> workItemIds, String username) {
        return workItemIds.collect { wiId -> complete(wiId.toInteger(), username) }
    }

    /**
     * Complete all work items matching with the provided query
     * @return a Map holding the result of moving the work items to Done
     */
    List complete(String query, String username) {
        def workItemsResults = []
        recordmAp.stream("Work Item", query, [runAs: username], { RecordmSearchHit wiHit ->
            workItemsResults << completeWorkItem(wiHit, username)
        })
    }

    /**
     * Complete a single work item
     * @return a Map holding the result of moving the work items to Done
     */
    Map complete(Integer wiId, String username) {
        def wiHit = recordmAp.search("Work Item", "id.raw:${wiId}", [size: "1", runAs: username]).getHits()?.get(0)
        if (wiHit == null) {
            return [wiId: wiId, status: 404, message: "Not found"]
        }

        return completeWorkItem(wiHit, username)
    }

    private Map completeWorkItem(RecordmSearchHit wiInstance, String username) {
        if (wiInstance.value("Agent Type") == "Human") {
            return completeHumanTask(wiInstance, username)

        } else {
            return unsupportedAgentType(wiInstance)
        }
    }

    private Map completeHumanTask(RecordmSearchHit wiInstance, String username) {
        if (wiInstance.value("State") == "Done") {
            return [wiId: wiInstance.getId(), status: 204, message: "Work item already completed"]
        }

        def workQueue = recordmAp.search("Work Queues", "id.raw:${wiInstance.value('Work Queue')}", [size: "1"])
                .getHits()
                .get(0)

        def doneCondition = wiInstance.value("Done Conditions")
        if (doneCondition != null) {
            def doneConditionErrorMsg = workQueue.value("Done Conditions Error Msg") ?: doneCondition

            def instanceData = recordmAp.search(wiInstance.value("Customer Data Definition").toString(), "id.raw:${wiInstance.value('Customer Data')}", [size: "1"])
                    .getHits()?.get(0)

            if (instanceData != null) {
                return [wiId: wiId, status: 404, message: "Customer data not found"]
            }

            def binding = new Binding(data: instanceData, recordm: recordmAp)
            try {
                if (!new GroovyShell(binding).evaluate(doneCondition)) {
                    return [wiId: wiId, status: 406, message: "${doneConditionErrorMsg}"]
                }

            } catch (Exception e) {
                log.error("[_wrkfl] Error evaluating Done Conditions {{ " +
                        "wiId: ${wiId}, code: ${doneCondition} }}", e)

                def previousErrors = (wiInstance.value("Automation Errors") ? wi.value("Automation Errors") + "\n\n" : "")
                def updatedMsgError = previousErrors + "Error evaluating 'Done Conditions': ${doneCondition} \n" + "Error: " + e.getMessage()

                recordmAp.update("Work Item", wiId, [
                        "State"            : "Error",
                        "Automation Errors": updatedMsgError
                ])

                return [wiId: wiId, status: 500, message: "Not found"]
            }
        }

        def wiUpdateResult = recordmAp.update("Work Item", wiId, ["State": "Done"], username)

        if (!wiUpdateResult.success() || wiUpdateResult.body.error > 0) {
            return [wiId: wiId, status: 500, message: "Internal error completing the work item"]

        } else if (wiUpdateResult.getBody().forbidden > 0) {
            return [wiId: wiId, status: 403, message: "You don't have permissions to update the Work Item"]
        }

        return [wiId: wiId, status: 200]
    }

    private Map unsupportedAgentType(RecordmSearchHit wiInstance) {
        return [wiId: wiId, status: 400, message: "Can't complete yet this agent type of work items"]
    }

}