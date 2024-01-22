package utils

import org.apache.commons.logging.LogFactory

class _wrkfl_utils {
    private log = LogFactory.getLog(_wrkfl_utils.class);

    private def recordm

    def _wrkfl_utils(recordm) {
        this.recordm = recordm
    }

    def cancelWorkItems(wQueueId, customerDataId, applicableStates) {
        def states = "(" + (applicableStates.collect({ return "\"" + it + "\"" }).join(" OR ")) + ")"
        recordm.update("Work Item"
                , "work_queue:${wQueueId} AND state:${states} AND customer_data:${customerDataId}"
                , ["State": "Canceled"]
                , "cob-bot")
    }

    def deleteWorkItems(customerDataId) {
        recordm.delete("Work Item"
                , "customer_data:${customerDataId}"
                , ['ignoreRefs': true, runAs: "cob-bot"])
    }


}
