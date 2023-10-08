def WORK_ITEM_STATE_FIELD = "State"

def workItemId = argsMap.workItemId
def nextState = argsMap.nextState

if (workItemId == null || nextState == null) {
    return json(400, ["errorMsg": "Missing required parameters"])
}

def result = recordm.update("Work Item", "recordmInstanceId:${workItemId}", [(WORK_ITEM_STATE_FIELD): nextState], argsMap.user)
if (result.success()) return {
    json(200, [success: true])

} else {
    json(500, [success: false])
}