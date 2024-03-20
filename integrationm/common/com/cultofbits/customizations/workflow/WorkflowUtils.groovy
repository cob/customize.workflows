package com.cultofbits.customizations.workflow

import com.cultofbits.integrationm.service.actionpack.RecordmActionPack
import org.apache.commons.logging.LogFactory

class WorkflowUtils {
    private log = LogFactory.getLog(WorkflowUtils.class);

    private RecordmActionPack recordm

    WorkflowUtils(RecordmActionPack recordm) {
        this.recordm = recordm
    }

    def cancelWorkItems(Integer wQueueId, Integer customerDataId, applicableStates) {
        def states = "(" + (applicableStates.collect({ return "\"" + it + "\"" }).join(" OR ")) + ")"

        recordm.update("Work Item"
                , "work_queue:${wQueueId} AND state:${states} AND customer_data:${customerDataId}"
                , ["State": "Canceled"]
                , "cob-bot")
    }

    def deleteWorkItems(Integer customerDataId) {
        recordm.delete("Work Item"
                , "customer_data:${customerDataId}"
                , ['ignoreRefs': true, runAs: "cob-bot"])
    }


}