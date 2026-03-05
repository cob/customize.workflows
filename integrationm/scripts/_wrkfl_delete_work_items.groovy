import com.cultofbits.customizations.workflow.WorkflowUtils
import groovy.transform.Field

@Field DEFS_TO_IGNORE = [
        "Work Queues"
        , "Work Item"
]

if (msg.product == "recordm" && msg.action == "delete" && !DEFS_TO_IGNORE.contains(msg.type)) {
    new WorkflowUtils(recordm).deleteWorkItems(msg.getId())
}
