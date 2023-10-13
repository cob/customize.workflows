import groovy.transform.Field

import java.math.RoundingMode

if (msg.product == "recordm" && msg.type == "Work Item" && msg.field('State').changed()) {

    def state = msg.value('State')
    def wqId = msg.value('Work Queue')
    def cdId = msg.value('Customer Data')

    def wqQuery = "id.raw:${wqId}"
    def wqSearchResult = recordm.search("Work Queues", wqQuery, [size: 1]);

    //Run the relevant On XXX code pieces aonfigured on the WorkQueue (which make updates on the customer Data instance
    if (wqSearchResult.success() && wqSearchResult.getTotal() > 0) {
        def wq = wqSearchResult.getHits().get(0)

        def code = wq.value("On " + state)
        if (code != null) {
            log.info("CODE: " + code)

            def defName = wq.value("Specific Data")
            def cdQquery = "id.raw:${cdId}"
            def cdSearchResult = recordm.search(defName, cdQquery, [size: 1]);
            if (cdSearchResult.success() && cdSearchResult.getTotal() > 0) {
                Map updates = [:]
                def data = cdSearchResult.getHits().get(0)

                def binding = new Binding(data: data, updates: updates)

                try {
                    new GroovyShell(binding).evaluate(code)
                } catch (Exception e) {
                    log.error("Error evaluating code {{ 'On ${state}' code: ${code} }}", e)
                    def previousErrors = (msg.value("Automation Errors") ? msg.value("Automation Errors") + "\n\n" : "")
                    recordm.update("Work Item", msg.instance.id, [
                            "State"            : "Error",
                            "Automation Errors": previousErrors +
                                    "Error evaluating 'On ${state}' code: ${code} \n" +
                                    "Error: " + e.getMessage()])
                    return
                }

                log.info("updates: ${updates}")

                def rmResponse = recordm.update(defName, cdQquery, updates)

                if (!rmResponse.ok()) {
                    log.error(rmResponse.getBody(String.class))
                }
            }
        }
    }


    //Update Workitem dates and times
    Map wiUpdates = [:]
    def nowDateTime = msg._timestamp_;
    def oldState = msg.oldInstance.value('State')

    def dateCreation = msg.value("Date of Creation", Long.class)
    def dateAssign = msg.value("Date of Assignment", Long.class)
    def dateStart = msg.value("Date of Start", Long.class)
    def dateFirstPending = msg.value("Date of first Pending", Long.class)
    def datePending = msg.value("Date of Pending", Long.class)
    def totalTimePendingHours = msg.value("Time of Pending", Double.class) ?: 0
    def dateDone = msg.value("Date of Done", Long.class)
    def dateCanceling = msg.value("Date of Canceling", Long.class)

    def isUnassigned = (msg.value('User') == null)
    if (isUnassigned && state != "To Assign") {
        def currentUser = userm.getUser(msg.user).getBody()
        wiUpdates["User"] = currentUser._links.self
        wiUpdates["Date of Assignment"] = nowDateTime
        wiUpdates["Time of Assignment"] = getDiifHOurs(dateCreation, nowDateTime)
    }

    //Casos em que estou a entrar no estado:
    switch (state) {
        case "Pending":
            if (!dateFirstPending) wiUpdates["Date of first Pending"] = nowDateTime
            wiUpdates["Date of Pending"] = nowDateTime
            break;
        case "Canceled":
            wiUpdates["Date of Canceling"] = nowDateTime
            break;
        case "Done":
            wiUpdates["Date of Done"] = nowDateTime
            wiUpdates["Time of Execution"] = getDiifHOurs(dateStart ?: dateCreation, nowDateTime)
            wiUpdates["Time Overall"] = getDiifHOurs(dateCreation, nowDateTime)
            break;
    }

    //Casos em que estou a sair do estado:
    switch (oldState) {
        case "To Assign":
            wiUpdates["Date of Assignment"] = nowDateTime
            wiUpdates["Time of Assignment"] = getDiifHOurs(dateCreation, nowDateTime)
            break;
        case "To Do":
            //se vier de pendente já tenho esta data preenchida
            if(!dateStart){
                wiUpdates["Date of Start"] = nowDateTime
                wiUpdates["Time of Start"] = getDiifHOurs(dateCreation, nowDateTime)
            }
            break;
        case "Pending":
            wiUpdates["Time of Pending"] = totalTimePendingHours + getDiifHOurs(datePending, nowDateTime)
            break;
    }

    def wiUpdateResponse = recordm.update(msg.type, msg.instance.id, wiUpdates)

    if (!wiUpdateResponse.ok()) {
        log.error(wiUpdateResponse.getBody(String.class))
    }

}

static def getDiifHOurs(startTime, endTime) {
    def elapsed = (new BigDecimal(endTime) - new BigDecimal(startTime))
    return elapsed.divide(new BigDecimal(60 * 60 * 1000), 2, RoundingMode.HALF_UP)

}