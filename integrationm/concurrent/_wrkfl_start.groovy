if(args.query == null || args.def == null){
    return json(400, [
            msg: "É necessário receber uma Definição (def) e uma query (query) para identificar as instâncias"
    ]);
}

log.info("[] starting Work Items {{def: ${args.def}, query: ${args.query}");

boolean allOk = true;

def query = "specific_data.raw:\"${args.def}\" AND launch_condition:*";
def WQs = recordm.search("Work Queues", query, [size: 100] as Map<String, String>)
        .hits.collect { hit ->
    def launchCondition = hit.value('Launch Condition');

    // msg.field("Estado").changedTo("C. Adjudicado") -> hit.value("Estado") == "C. Adjudicado"
    def pattern = ~/msg\.field\(\s*["']([^'"]+)['"]\s*\)\.changedTo\(\s*['"]([^'"]+)['"]\s*\)/

    def m = launchCondition =~ pattern;
    if (m.find()) {
        launchCondition = "hit.value('${m.group(1)}') == '${m.group(2)}'"
        log.info("converted launch condition to: ${launchCondition}")

    } else {
        allOk = false;
        log.warn("couldn't convert launch condition: ${launchCondition}")
        launchCondition = "false"
    }

    return [
            id: hit.value('id'),
            'Launch Condition': launchCondition,
            'Initial State': hit.values('Possible States')[0],
            'Specific Data Main Customer Data Field': hit.value("Specific Data Main Customer Data Field")
    ]
};

recordm.stream(args.def, args.query, { hit ->
    WQs.forEach { WQ ->
        def launchCondition = WQ.get('Launch Condition') as String;
        setProperty("hit", hit);
        if (evaluate(launchCondition)) {
            recordm.create("Work Item", [
                    "Customer Data": hit.getId(),
                    "Main Customer Data": "" + hit.value(WQ.get('Specific Data Main Customer Data Field') ?: ''),
                    "Work Queue": WQ.get("id") as String,
                    "State": WQ.get("Initial State") as String
            ])
        }
    }
})

return json(allOk ? 200 : 500, [:])
