def WORK_ITEM_STATE_FIELD = "State"

def workItemId = argsMap.workItemId
def nextState = argsMap.nextState

if (workItemId == null || nextState == null) {
    return json(400, ["errorMsg": "Missing required parameters"])
}

//Check Done Conditions if next state is Done
if (nextState == "Done") {
    def wiSearch = recordm.search("Work Item", "id.raw:${workItemId}", [size: 1]);

    if (wiSearch.success() && wiSearch.getTotal() > 0) {
        def wi = wiSearch.getHits().get(0)

        def wqSearch = recordm.search("Work Queues", "id.raw:${wi.value('Work Queue')}", [size: 1]);

        if (wqSearch.success() && wqSearch.getTotal() > 0) {
            def wq = wqSearch.getHits().get(0)
            def doneConditions = wq.value("Done Conditions")
            def doneConditionsErrorMsg = wq.value("Done Conditions Error Msg") ?: doneConditions

            if (doneConditions != null) {
                def cdSearch = recordm.search(wi.value("Customer Data Definition"), "id.raw:${wi.value('Customer Data')}", [size: 1]);

                if (cdSearch.success() && cdSearch.getTotal() > 0) {
                    def data = cdSearch.getHits().get(0)

                    def binding = new Binding(data: data, recordm: recordm)
                    try {
                        if (!new GroovyShell(binding).evaluate(doneConditions)) {
                            return json(406, [success: false,
                                              error: "Done conditions returned false. <br>" +
                                                      "<div style=\"text-wrap: balance;font-style: italic;font-size: 1.2em;padding: 5px;\">" +
                                                      "$doneConditionsErrorMsg" +
                                                      "</div>"])
                        }
                    } catch (Exception e) {
                        log.error("Error evaluating Done Conditions {{ code: ${doneConditions} }}", e)

                        def previousErrors = (wi.value("Automation Errors") ? wi.value("Automation Errors") + "\n\n" : "")
                        recordm.update("Work Item", workItemId, [
                                "State"            : "Error",
                                "Automation Errors": previousErrors + "Error evaluating 'Done Conditions': ${doneConditions} \n" + "Error: " + e.getMessage()
                        ])

                        return json(500, [success: false,
                                          error: "Error evaluating 'Done Conditions': ${doneConditions} "])
                    }
                }
            }
        }
    }
}

//If validations passed, change the state
def result = recordm.update("Work Item", workItemId.toInteger(), [(WORK_ITEM_STATE_FIELD): nextState], argsMap.user)

if (result.success()) return {
    json(200, [success: true])

} else {
    json(500, [success: false])
}