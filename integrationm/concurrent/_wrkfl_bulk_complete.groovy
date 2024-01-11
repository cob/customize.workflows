import com.cultofbits.customizations.workflow.WorkItemStateHandler

def wiIds = argsMap.wiIds
def query = argsMap.query

if (wiIds == null && query == null) {
    return json(400, ["errorMsg": "Missing required parameters"])
}

def wiResults

def wiHandler = new WorkItemStateHandler(recordm, log)
if (wiIds != null) {
    wiResults = wiHandler.complete(wiIds, argsMap.user)

} else {
    wiResults = wiHandler.complete(query, argsMap.user)
}

return json(200, [workItems: wiResults])
