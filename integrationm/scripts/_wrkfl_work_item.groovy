import org.codehaus.jettison.json.JSONObject
import com.google.common.cache.*

import java.util.concurrent.ExecutionException
import java.util.concurrent.TimeUnit
import groovy.transform.Field
import java.math.RoundingMode


@Field static workQueuesCache = CacheBuilder.newBuilder()
        .expireAfterWrite(5, TimeUnit.MINUTES)
        .build()

if (msg.product == "recordm" && msg.type == "Work Queues") {
    log.info("Invalidating WorkQueues cache")
    workQueuesCache.invalidateAll()
}


if (msg.product == "recordm" && msg.type == "Work Item" && msg.action != "delete") {

    def workQueue = recordm.get(msg.value("Work Queue")).getBody()

    if (msg.action == "add") {

        def wiUpdates = [:]

        switch (workQueue.value("Agent Type")) {
            case "RPA":
                executor.execute {
                    def concurrent = workQueue.value("Concurrent")
                    log.info("The new workm item is a RPA Action {{concurrent: ${concurrent} }}")

                    def start = System.currentTimeMillis()
                    def actionResponse = actionPacks.imRest.post("/concurrent/${concurrent}", [id: msg.value("Customer Data")], "cob-bot")
                    def stop = System.currentTimeMillis()

                    def updateMap

                    try {
                        JSONObject responseMap = new JSONObject(actionResponse)
                        updateMap = [
                                "State"            : responseMap.getString("success") == "true" ? "Done" : "Error",
                                "Automation Errors": responseMap.optString("message"),
                                "Time of Execution": getDiifHOurs(start, stop)
                        ]
                    } catch (Exception ignored) {
                        updateMap = [
                                "State"            : "Error",
                                "Automation Errors": "Internal Server Error. Error executing RPA.",
                                "Time of Execution": getDiifHOurs(start, stop)
                        ]
                    }

                    recordm.update("Work Item", msg.id, updateMap, "cob-bot")
                }

                break
            case "Human":
                def humanType = msg.value("Human Type")
                switch (humanType) {
                    case "User Field":
                        def fieldWithUserValue = workQueue.value("User Field")
                        if (fieldWithUserValue != null) {
                            def customerData = recordm.get(msg.value("Customer Data")).getBody()
                            def uriUsers = customerData.values(fieldWithUserValue)
                            if (uriUsers.size() > 0) {
                                uriUsers.eachWithIndex { uri, idx -> wiUpdates["User[${idx}]"] = uri }
                            }
                        }
                        break

                    case "User":
                        def fieldWithUserUri = workQueue.value("User")
                        if (fieldWithUserUri != null) {
                            wiUpdates["User[0]"] = fieldWithUserUri
                        }
                        break

                    case "Group Field":
                        def fieldWithGroupValue = workQueue.value("Group Field")
                        if (fieldWithGroupValue != null) {
                            def customerData = recordm.get(msg.value("Customer Data")).getBody()
                            def group = customerData.value(fieldWithGroupValue)
                            if (group != null) {
                                wiUpdates["Assigned Group"] = group
                            }
                        }
                        break

                    case "Group":
                        def fieldWithGroupUri = workQueue.value("Group")
                        if (fieldWithGroupUri != null) {
                            wiUpdates["Assigned Group"] = fieldWithGroupUri
                        }
                        break
                }

                break

            case "AI":
                log.info("TO BE DONE")

                break
        }

        //Set Visibility type
        def visibilityType = msg.value("Visibility Type")
        switch (visibilityType) {
            case "User Field":
                def fieldWithUserValue = workQueue.value("Visibility User Field")
                if (fieldWithUserValue != null) {
                    def customerData = recordm.get(msg.value("Customer Data")).getBody()
                    def uriUsers = customerData.values(fieldWithUserValue)
                    if (uriUsers.size() > 0) {
                        uriUsers.eachWithIndex { uri, idx -> wiUpdates["Visibility User[${idx}]"] = uri }
                    }
                }
                break

            case "User":
                def fieldWithUserUri = workQueue.value("Visibility User")
                if (fieldWithUserUri != null) {
                    wiUpdates["Visibility User"] = fieldWithUserUri
                }
                break

            case "Group Field":
                def fieldWithGroupValue = workQueue.value("Visibility Group Field")
                if (fieldWithGroupValue != null) {
                    def customerData = recordm.get(msg.value("Customer Data")).getBody()
                    def group = customerData.value(fieldWithGroupValue)
                    if (group != null) {
                        wiUpdates["Visibility Group"] =  group
                    }
                }
                break

            case "Group":
                def fieldWithGroupUri = workQueue.value("Visibility Group")
                if (fieldWithGroupUri != null) {
                    wiUpdates["Visibility Group"] = fieldWithGroupUri
                }
                break
        }

        recordm.update("Work Item", msg.id, wiUpdates, "cob-bot")

    } else if (msg.field('State').changed()) {
        def state = msg.value('State')

        def wq = getWorkQueueInstance(msg.value('Work Queue'))

        if (wq == null) {
            log.error("Work Item refers non-existing Work Queue {{workItemId:${msg.instance.id}, WorkQueueId:${msg.value('Work Queue')} }}")

        } else {
            //Run the relevant On XXX code pieces configured on the WorkQueue (which make updates on the customer Data instance
            def code = wq.value("On " + state)
            if (code != null) {
                executor.execute {
                    log.debug("On ${state} CODE: " + code)

                    def defName = wq.value("Specific Data")
                    def cdInstance = recordm.get(msg.value('Customer Data'))?.getBody()

                    if (cdInstance != null) {
                        Map updates = [:]

                        def binding = new Binding(data: cdInstance, updates: updates, recordm: recordm)

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

                        def rmOptions = [:]
                        if (msg.user != "integrationm") {
                            rmOptions = [runAs: msg.user, "substituting": "cob-bot"]
                        }

                        recordm.update(defName, msg.value('Customer Data'), updates, rmOptions)
                    }
                }
            }
        }


        //Update Workitem dates and times
        Map wiUpdates = [:]
        def nowDateTime = msg._timestamp_
        def oldState = msg.oldInstance.value('State')

        def dateCreation = msg.value("Date of Creation", Long.class)
        def dateStart = msg.value("Date of Start", Long.class)
        def dateFirstPending = msg.value("Date of first Pending", Long.class)
        def datePending = msg.value("Date of Pending", Long.class)
        def totalTimePendingHours = msg.value("Time of Pending", Double.class) ?: 0

        def currentUser = userm.getUser(msg.user).getBody()

        def isUnassigned = (msg.value('User') == null)

        // Se tinha um user, e agora ja nao tem
        def previousUser = msg.getOldInstance().value("User")
        def userCleared = previousUser && isUnassigned

        // So atualiza o user se o update anterior não foi um unassignment
        if (isUnassigned && state != "To Assign" && !userCleared) {
            wiUpdates["User"] = currentUser._links.self
            wiUpdates["Self Assigned"] = "Yes"
            wiUpdates["Date of Assignment"] = nowDateTime
            wiUpdates["Time of Assignment"] = 0.01
        }

        //Casos em que estou a entrar no estado:
        switch (state) {
            case "Pending":
                if (!dateFirstPending) wiUpdates["Date of first Pending"] = nowDateTime
                wiUpdates["Date of Pending"] = nowDateTime
                break
            case "Canceled":
                wiUpdates["Date of Canceling"] = nowDateTime
                wiUpdates["Time Overall"] = getDiifHOurs(dateCreation, nowDateTime)
                break
            case "Done":
                wiUpdates["User of Done"] = currentUser._links.self
                wiUpdates["Done by Assignee"] = (isUnassigned || msg.value("User") == wiUpdates["User of Done"] ? "Yes" : "No")
                wiUpdates["Date of Done"] = nowDateTime
                wiUpdates["Time of Execution"] = dateStart
                        ? getDiifHOurs(dateStart, nowDateTime)
                        : (msg.value("Time of Execution") ?: 0.01)
                wiUpdates["Time Overall"] = getDiifHOurs(dateCreation, nowDateTime)
                break
        }

        //Casos em que estou a sair do estado:
        switch (oldState) {
            case "To Assign":
                wiUpdates["Date of Assignment"] = nowDateTime
                wiUpdates["Time of Assignment"] = getDiifHOurs(dateCreation, nowDateTime)
                break
            case "To Do":
                //se vier de pendente já tenho esta data preenchida
                if (!dateStart) {
                    wiUpdates["Date of Start"] = nowDateTime
                    wiUpdates["Time of Start"] = getDiifHOurs(dateCreation, nowDateTime)
                }
                break
            case "Pending":
                wiUpdates["Time of Pending"] = totalTimePendingHours + getDiifHOurs(datePending, nowDateTime)
                break
        }

        recordm.update(msg.type, msg.instance.id, wiUpdates)
    }
}

static def getDiifHOurs(startTime, endTime) {
    def elapsed = (new BigDecimal(endTime) - new BigDecimal(startTime))
    return elapsed.divide(new BigDecimal(60 * 60 * 1000), 2, RoundingMode.HALF_UP)
}

def getWorkQueueInstance(wqId) {
    try {
        return workQueuesCache.get(
                wqId,
                { recordm.get(wqId).getBody() }
        )
    } catch (ExecutionException ignore) {
        return null
    }
}
