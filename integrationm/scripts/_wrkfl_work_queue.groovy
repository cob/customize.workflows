import groovy.transform.Field

@Field DEFS_TO_IGNORE = [
        "Work Queues"
        , "Work Item"
];

if (msg.product == "recordm" && !DEFS_TO_IGNORE.contains(msg.type)) {

    def query = "specific_data.raw:\"${msg.type}\" AND launch_condition:*"

    recordm.stream("Work Queues", query, { hit ->
        def launchCondition = hit.value('Launch Condition')
        log.info("Launch content: ${launchCondition.split("\n")}")

        if (evaluate(launchCondition)) {
            def possibleStates = hit.value('Possible States')
            log.info("Possible States: ${possibleStates}")

            Map updates = [:]
            updates["Customer Data"] = msg.instance.id
            updates["Work Queue"] = hit.value("id")
            updates["State"] = possibleStates[0]

            log.info("updates: ${updates}")
            recordm.create("Work Item", updates)
        }
    })

}