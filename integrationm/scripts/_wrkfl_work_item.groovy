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
                new GroovyShell(binding).evaluate(code)

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
    def now = new Date();
    def nowDateTime = now.time;
    def oldState = msg.oldInstance.value('State')

    def dateCreation = msg.value("Date of Creation")
    def dateAssign = msg.value("Date of Assignment")
    def dateStart = msg.value("Date of Start")
    def datePending = msg.value("")
    def dateDone = msg.value("Date of Done")
    def dateCanceling = msg.value("Date of Canceling")

    switch (state) {
        case "Pending":
            wiUpdates["Date of first Pending"] = nowDateTime
            wiUpdates["Date of Pending"] = nowDateTime
            wiUpdates["Time of Pending"] = getDiifHOurs(date, nowDateTime)
            break;
        case "Canceled":
            wiUpdates["Date of Canceling"] = nowDateTime
            wiUpdates["Time of Execution"] = getDiifHOurs(dateStart, nowDateTime)
            wiUpdates["Time Overall"] = getDiifHOurs(dateCreation, nowDateTime)
            break;
    }

    switch (oldState) {
        case "To Assign":
            wiUpdates["Date of Assignment"] = nowDateTime
            wiUpdates["Time of Assignment"] = getDiifHOurs(dateCreation, nowDateTime)
            break;
        case "To Do":
            wiUpdates["Date of Start"] = nowDateTime
            wiUpdates["Time of Start"] = getDiifHOurs(dateCreation, nowDateTime)
            break;
        case "Done":
            wiUpdates["Date of Done"] = nowDateTime
            wiUpdates["Time of Execution"] = getDiifHOurs(dateStart, nowDateTime)
            wiUpdates["Time Overall"] = getDiifHOurs(dateCreation, nowDateTime)
            break;
        case "Pending":
            wiUpdates["Time of Pending"] = getDiifHOurs(datePending, nowDateTime)
            break;
    }
    


    def wiUpdateResponse = recordm.update(msg.type, msg.instance.id, wiUpdates)

    if (!wiUpdateResponse.ok()) {
        log.error(wiUpdateResponse.getBody(String.class))
    }

}

static def getDiifHOurs(startTime, endTime) {
    def elapsed = (new BigDecimal(endTime) - new BigDecimal(startTime))
    return elapsed.divide(new BigDecimal(60 * 60 * 1000), 8, RoundingMode.HALF_UP)

}