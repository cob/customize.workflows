// import groovy.transform.Field

// @Field DEFS_TO_IGNORE = [
//         "Work Queues"
//         , "Work Item"
// ];

// if (msg.product == "recordm" && !DEFS_TO_IGNORE.contains(msg.type)) {

//     def customer_data = msg.instance.id;
//     // HACK Gigante
//     if(msg.type == 'Lotes'){
//         customer_data = msg.value('Nº Procedimento')
//     }
//     def query = "wait_data_definitions:\"${msg.type}\" AND customer_data:${customer_data} " +
//             "AND state:\"To Do\" AND agent_type:Wait"

//     recordm.stream("Work Item", query, { wi ->
//         def wqId = wi.value('Work Queue')
//         def wq = recordm.get(wqId as String)

//         def waitId = wq.body.value("Wait Action")
//         def wait = recordm.get(waitId).getBody()

//         def conditions = wait.value("Condition")
//         def concurrent = wait.value("Concurrent")

//         log.info("WI: ${wi.id}, WQ: ${wqId}, Wait: ${waitId}")

//         def binding = new Binding(data: msg, recordm: recordm)
//         try {
//             if (new GroovyShell(binding).evaluate(conditions)) {
//                 def actionResponse = actionPacks.imRest.post("/concurrent/${concurrent}", [
//                         id: customer_data
//                 ], "cob-bot")

//                 recordm.update("Work Item", wi.id as String, ["State": "Done"])
//             }
//         } catch (Exception e) {
//             log.error("Error evaluating Conditions {{ code: ${conditions} }}", e)

//             def previousErrors = (wi.value("Automation Errors") ? wi.value("Automation Errors") + "\n\n" : "")
//             recordm.update("Work Item", wi.id as String, [
//                     "State"            : "Error",
//                     "Automation Errors": "Error evaluating 'Conditions': ${conditions} \n" + "Error: " + e.getMessage()
//             ])
//         }
//     })

// }


// ForEach generic conditions cached test condition
// each waitCondition has [
//      genericCondition = field(Generic Condition)
//      Work Queue id = field(id) 
//      WorkItem customer_data id To Complete  = "name:\"field(name)\" AND state:\"In Progress\" AND customer_data:${ EVAL(field(WI Query)) }"
// ]

/*  client harcoded EXAMPLES

if (msg.product == "recordm" && msg.type == 'Lotes' && msg.field("Estado").changedFrom("3. Decisão de participação") ) {
    if( recordm.search("Lotes", "nº_procedimento.raw:"+msg.value("Nº Procedimento") + " AND -decisão_lote:*  AND -id:" + msg.instance.id, [size: 1]).getTotal() == 0 ) {
        recordm.update("Work Item"
                    , "work_queue:1049505 AND state:\"In Progress\" AND customer_data:${msg.value("Nº Procedimento")}"
                    , ["State": "Done"]
                    , "cob-bot")
    }
}

//Aguarda ganhar um lote ou perder todos
if (msg.product == "recordm" && msg.type == 'Lotes' &&
        (
        msg.field("Estado").changedTo("A. Lote Ganho")
        ||
        msg.field("Estado").changedTo("B. Lote Não Concorrido")
        ||
        msg.field("Estado").changedTo("C. Lote Perdido")
        )) {

    if(msg.field("Estado").changedTo("A. Lote Ganho")
          ||
        recordm.search("Lotes", "nº_procedimento.raw:"+msg.value("Nº Procedimento") + " AND -estado:(\"A. Lote Ganho\" OR \"B. Lote Não Concorrido\" OR \"C. Lote Perdido\")", [size: 1]).getTotal() == 0 ) {
        recordm.update("Work Item"
                , "work_queue:1404012 AND state:\"In Progress\" AND customer_data:${msg.value("Nº Procedimento")}"
                , ["State": "Done"]
                , "cob-bot")
    }

}

if (msg.product == "recordm" && msg.type == 'Concursos' && msg.field("Estado").changedFrom("4. Elaboração de proposta") ) {
    def loteIDs = recordm.search("Lotes", "nº_procedimento.raw:" + msg.instance.id, [size: 100])
            .hits.collect { it.id }
            .join(" OR ")
    recordm.update("Work Item"
                , "work_queue:1049555 AND state:\"In Progress\" AND customer_data:(${loteIDs})"
                , ["State": "Done"]
                , "cob-bot")
}

//Aguardar Data Limite Aceitação Minuta
if (msg.product == "cron" && msg.type == "clock" && msg.action == "7amTick") {

    //contratos onde a "Data Limite Reclamação/ Aceitação Minuta" é o dia corrente
    def contratosIDs = recordm.search("Contratos", "data_limite_reclamação\\/_aceitação_minuta.date:now\\/d", [size: 200])
            .hits.collect { it.id }
            .join(" OR ")

    if (contratosIDs != null && contratosIDs != ""){
        //marca wait "Aguardar Data Limite Aceitação Minuta" como Done
        recordm.update("Work Item"
                , "work_queue:1365764 AND state:\"In Progress\" AND customer_data:(${contratosIDs})"
                , ["State": "Done"]
                , "cob-bot")

        //cancela outras tarefas associadas que estejam abertas:
        //Confirmar validação de negócio (wq 1365762)
        //Reclamar Minuta (wq 1365763)
        //Validar Minuta na plataforma / email (wq 1431996)
        recordm.update("Work Item"
                , "work_queue:(1365762 OR 1365763 1431996) AND state:\"To Do\" AND customer_data:(${contratosIDs})"
                , ["State": "Canceled"]
                , "cob-bot")
    }
}

 */