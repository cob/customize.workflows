import com.cultofbits.integrationm.service.dictionary.recordm.RecordmSearchHit
import com.cultofbits.customizations.workflow.WorkflowUtils
import com.google.common.cache.CacheBuilder
import groovy.json.internal.Cache
import groovy.transform.Field

import java.util.concurrent.TimeUnit

@Field DEFS_TO_IGNORE = [
        "Work Queues"
        , "Work Item"
];


@Field static workQueuesCache = CacheBuilder.newBuilder()
        .expireAfterWrite(5, TimeUnit.MINUTES)
        .build()

if (msg.product == "recordm" && msg.type == "Work Queues") {
    log.info("Invalidating WorkQueues cache")
    workQueuesCache.invalidateAll()
}


if (msg.product == "recordm" && !DEFS_TO_IGNORE.contains(msg.type)) {

    switch (msg.action) {
        case "add":
        case "update":
            def query = "specific_data.raw:\"${msg.type}\" AND launch_condition:*"

            //Assumes max 200 WQs per query
            workQueuesCache.get(query, { recordm.search("Work Queues", query, [size: 200]).getHits() })
                    .each { hit ->
                        def launchCondition = hit.value('Launch Condition')
                        log.debug("Launch content: ${launchCondition.split("\n")}")

                        try {
                            if (evaluate(launchCondition)) {
                                def possibleStates = hit.value('Possible States')
                                log.info("Launch condition true: ${launchCondition.split("\n")}")
                                log.info("Possible States: ${possibleStates}")

                                Map<String, Object> updates = [:]
                                updates["Customer Data"] = msg.instance.id

                                if (hit.value("Specific Data Main Customer Data Field")) {
                                    updates["Main Customer Data"] = msg.value(hit.value("Specific Data Main Customer Data Field"), String.class)
                                }
                                updates["Work Queue"] = hit.value("id")
                                updates["State"] = possibleStates[0]

                                log.info("updates: ${updates}")
                                recordm.create("Work Item", updates)
                            }
                        } catch (Exception e) {
                            log.error("couldn't evaluate launchcondition {{" +
                                    "WQ: ${hit.value('id')}:${hit.value('Code')}:${hit.value('Name')}, " +
                                    "condition: ${launchCondition}" +
                                    "}}", e);
                        }
                    }

            break;

        case "delete":
            new WorkflowUtils(recordm).deleteWorkItems(msg.getId())
            break;

    }
}