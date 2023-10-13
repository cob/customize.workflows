def WORK_ITEM_STATE_FIELD = "State"

def workItemId = argsMap.workItemId
def nextState = argsMap.nextState

if (workItemId == null || nextState == null) {
    return json(400, ["errorMsg": "Missing required parameters"])
}

if (nextState == "Done") {
    def wiSearchResult = recordm.search("Work Item", "id.raw:${workItemId}", [size: 1]);

    if (wiSearchResult.success() && wiSearchResult.getTotal() > 0) {
        def wi = wiSearchResult.getHits().get(0)
        def cdId = wi.value('Customer Data')
        def defName = wi.value("Customer Data Definition")

        def cdQquery = "id.raw:${cdId}"
        def cdSearchResult = recordm.search(defName, cdQquery, [size: 1]);
        if (cdSearchResult.success() && cdSearchResult.getTotal() > 0) {
            def wqId = wi.value('Work Queue')
            def wqSearchResult = recordm.search("Work Queues", "id.raw:${wqId}", [size: 1]);
            if (wqSearchResult.success() && wqSearchResult.getTotal() > 0) {
                def wq = wqSearchResult.getHits().get(0)
                def doneConditions = wq.value("Done Conditions")

                if (doneConditions != null) {
                    def data = cdSearchResult.getHits().get(0)

                    def binding = new Binding(data: data)

                    try {
                        if (!new GroovyShell(binding).evaluate(doneConditions)) {
                            return json(406, [success: false, error: "Done conditions returned false <br><code>{$doneConditions}</code>"])
                        }
                    } catch (Exception e) {
                        log.error("Error evaluating Done Conditions {{ code: ${doneConditions} }}", e)
                        def previousErrors = (wi.value("Automation Errors") ? wi.value("Automation Errors") + "\n\n" : "")
                        recordm.update("Work Item", msg.instance.id, [
                                "State"            : "Error",
                                "Automation Errors": previousErrors +
                                        "Error evaluating 'Done Conditions': ${doneConditions} \n" +
                                        "Error: " + e.getMessage()])

                        return json(500, [success: false])
                    }
                }
            }
        }
    }
}

def result = recordm.update("Work Item", "recordmInstanceId:${workItemId}", [(WORK_ITEM_STATE_FIELD): nextState], argsMap.user)
if (result.success()) return {
    json(200, [success: true])

} else {
    json(500, [success: false])
}