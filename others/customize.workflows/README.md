# COB Workflow

## Install

`cob-cli customize workflow`

## Setup:

### IntegrationM
* Add new rest action pack for integrationm in `integrationm/services/com.cultofbits.integrationm.service.properties`

```properties
action.name=...,imRest

action.imRest=rest
action.imRest.base-url=http://localhost:40380
action.imRest.cookie-name=cobtoken
action.imRest.cookie-value=<intemporal token for integrationm user>
```

### UserM

* Add new user `cob-bot` with `system` privileges

### RecordM

* Import all definitions.



### Definition Upgrades:

#### 0.14.0 => 0.17.0  (ver servinform-galp)
* Work Queues
```
ALTERADOS:
Business Process -> Não obrigatório
Human Type ->  $[*Group,Specific Group,User,Specific User] $expanded $groupEdit

NOVOS CAMPOS:
State Field -> $auto.ref(Business Process).field(State Field)

Group Field -> $groupEdit Identifies the field with the group value from customer data instance. This field should be an \$extRef pointing to UserM.
Specific User   ->  $extRef(userm,/userm/user/search?q={{this}}) $groupEdit
Specific User Username  -> $auto.ref(Specific User).field(username) $style[hide]

RENOMEADOS:  (ficam debaixo de uma condição diferente; pode ser preciso migração prévia de dados)
Group -> Specific Group        (E remove ser DUPLICAVEL)
Group Name -> Specific Group Name

```
* Work Item
```
ALTERADOS:
State -> $[To Assign,To Do,In Progress,Done,Pending,Error,Canceled] $instanceDescription $styleResultColumn(To Assign:BgDimOrange,To Do:BgDimBlue,In Progress:BgDimBlue,Pending:BgDimOrnage,Done:Green,Canceled:Gray,Error:Red) $styleResultRows(Done:bg-neutral-200,Canceled:bg-neutral-200) $groupEdit
Sef Assigned -> $[Yes,No]

Group  ->  $auto.ref(Work Queue).field(Specific Group Name)
Group -> SE Human Type=Specific Group

RENOMEADOS:
Sef Assigned -> Self Assigned
SUBCAMPOS COM CAMPO PAI ALTERADO:
Self Assigned : Execution Info  Users

NOVOS CAMPOS:
Users -> $group $expanded $style[subgroup]
User of Done ->  $extRef(userm,/userm/user/search?q={{this}}*) $groupEdit  $styleResultColumn(/userm/user/36:DimGray)
Done by Assignee -> $[Yes,No]

```