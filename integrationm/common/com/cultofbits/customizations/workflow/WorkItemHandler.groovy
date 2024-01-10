package com.cultofbits.customizations.workflow

import com.cultofbits.integrationm.service.actionpack.RecordmActionPack

class WorkItemHandler {

    private final RecordmActionPack recordmAp
    private final Object log

    def WorkItemHandler(recordmAp, log) {
        this.recordmAp = recordmAp
        this.log = log
    }

    List complete(List<Integer> workItemIds, String username) {
        return workItemIds.collect { wiId -> complete(wiId, username) }
    }

    Map complete(wiId, username) {
        def wiInstance = recordmAp.search("Work Item", "id.raw:${wiId}", [size: "1"]).getHits()?.get(0)
        if (wiInstance == null) {
            return [wiId: wiId, status: 404, message: "Not found"]
        }

        def workQueue = recordmAp.search("Work Queues", "id.raw:${wiInstance.value('Work Queue')}", [size: "1"])
                .getHits()
                .get(0)

        def doneCondition = wq.value("Done Conditions")
        if (doneCondition != null) {
            def doneConditionErrorMsg = workQueue.value("Done Conditions Error Msg") ?: doneCondition

            def instanceData = recordmAp.search(wiInstance.value("Customer Data Definition").toString(), "id.raw:${wiInstance.value('Customer Data')}", [size: "1"]).getHits()?.get(0)
            if (instanceData != null) {
                return [wiId: wiId, status: 404, message: "Customer data not found"]
            }

            def binding = new Binding(data: instanceData, recordm: recordmAp)
            try {
                if (!new GroovyShell(binding).evaluate(doneCondition)) {
                    return [wiId: wiId, status: 406, message: "${doneConditionErrorMsg}"]
                }

            } catch (Exception e) {
                this.log.error("[_wrkfl] Error evaluating Done Conditions {{ wiId: ${wiId}, code: ${doneCondition} }}", e)

                def previousErrors = (wiInstance.value("Automation Errors") ? wi.value("Automation Errors") + "\n\n" : "")
                recordmAp.update("Work Item", wiId, [
                        "State"            : "Error",
                        "Automation Errors": previousErrors + "Error evaluating 'Done Conditions': ${doneCondition} \n" + "Error: " + e.getMessage()
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
}