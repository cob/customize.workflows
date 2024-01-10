import com.cultofbits.customizations.workflow.WorkItemHandler

def wiIds = argsMap.wiIds

if (wiIds == null) {
    return json(400, ["errorMsg": "Missing required parameters"])
}

def wiResults = new WorkItemHandler(recordm, log)
        .complete(wiIds, argsMap.user)

return json(200, wiResults)
