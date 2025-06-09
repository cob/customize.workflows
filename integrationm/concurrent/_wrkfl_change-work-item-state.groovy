import static com.cultofbits.integrationm.service.internal.rest.SimpleResponse.json

def WORK_ITEM_STATE_FIELD = "State"

def workItemId = args.workItemId
def nextState = args.nextState

if (workItemId == null || nextState == null) {
    return json(400, ["errorMsg": "Missing required parameters"])
}

//Check Done Conditions if next state is Done
if (nextState == "Done") {
    def wiGet = recordm.get(workItemId)

    if (wiGet.ok()) {
        def wi = wiGet.body

        def wqGet = recordm.get(wi.value('Work Queue'));

        if (wqGet.ok()) {
            def wq = wqGet.body
            def doneConditions = wq.values("Done Conditions")
            def doneConditionsErrorMsgs = wq.values("Done Conditions Error Msg") ?: doneConditions

            if (doneConditions.size() > 0) {
                def cdGet = recordm.get(wi.value('Customer Data'));

                if (cdGet.ok()) {
                    def data = cdGet.body

                    def evaluatedErrorMessages = []

                    for (int i = 0; i < doneConditions.size(); i++) {
                        def conditionCode = doneConditions[i]
                        def binding = new Binding(data: data, recordm: recordm)
                        try {
                            if (!new GroovyShell(binding).evaluate(conditionCode)) {
                            evaluatedErrorMessages.add( doneConditionsErrorMsgs[i] )
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


                    if( evaluatedErrorMessages.size() > 0) {
                        
                        return json(406, [success: false, error: 
                            "Done conditions returned false. <br>" +
                            "<div style=\"text-wrap: balance;font-style: italic;font-size: 1.2em;padding: 5px;\">" +
                            evaluatedErrorMessages.join(' <br><br> ') +
                            "</div>"])
                    }            
                }
            }
        }
    }
}

//If validations passed, change the state
def result = recordm.update("Work Item", workItemId.toInteger(), [(WORK_ITEM_STATE_FIELD): nextState], argsMap.user)

if (!result.success() || result.body.error > 0)
    return json(500, [success: false,
                      error  : "We couldn't update the Work Item: " + result.body])

else if (result.getBody().updated > 0)
    return json(200, [success: true])

else if (result.getBody().forbidden > 0)
    return json(403, [success: false,
                      error  : "You don't have permissions to update the Work Item"])
