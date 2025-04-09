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
* Add the following customizations:
  * cob-cli customize styleResults
  * cob-cli customize commons-validators

```
Permission de read de work items:

instances:read:<def_id_work_item>:
(doc["assigned_group_name.raw"].size() > 0 && params.user.groups.contains(doc["assigned_group_name.raw"][0]))
||
(doc["username.raw"].stream().anyMatch(u -> params.user.username == u))

instances:update:<def_id_work_item>:
(doc["assigned_group_name.raw"].size() > 0 && params.user.groups.contains(doc["assigned_group_name.raw"][0]))
||
(doc["username.raw"].stream().anyMatch(u -> params.user.username == u))

```

### Definition Upgrades:

#### 1.4.0
* Set  Work Item field `User` duplicable
```
CHANGED:
Execution Status > User: Duplicable
```

#### 1.3.0
* Add fields `Work Queue Code`, `Output` in definition `Work Items`


Definition: Work Queues
```
ADDED:
Work Queue:
   Work Queue Code: $auto.ref(Work Queue).field(Code)
   
Execution Info:
   Output: $text   
```

#### 1.2.0
* Make field `Code` in definition `Work Queues` unique


Definition: Work Queues
```
CHANGED:
Code: $instanceDescription $commons.validate(uniqueValue(showLink=true))
```

#### 1.0.0 
* Delete Work Items

Moved file from `integrationm/common/utils/_wrkfl_utils.groovy` to ` com/cultofbits/customizations/workflow/WorkflowUtils`.
This will impact the imports for this classe:

CHANGED:
```
import utils._wrkfl_utils;
...

new _wrkfl_utils(recordm);
```

To:
```
import com.cultofbits.customizations.workflow.WorkflowUtils;
...

new WorkflowUtils(recordm);
```
* On update delete file `integrationm/common/utils/_wrkfl_utils.groovy`

#### 0.17.4  (ver servinform-galp)
* Work Items
```
ALTERADOS:
Time of Pending : $number(2)  -> $number(2) $default(0)
```

#### 0.17.2  (ver servinform-galp)
* Work Queues
```
ALTERADOS:
Human Type : $[*Group,Group Field,User,User Field] $expanded $groupEdit
Group Field : SE =Group Field
User Field : SE =User Field
Specific User : SE =User
Specific User Username : $auto.ref(User).field(username) $style[hide]
Specific Group : SE =Group
Specific Group Name : $auto.ref(Group).field(name) $style[hide]
RENOMEADOS:
Specific User -> User
Specific User Username ->  User Username
Specific Group ->  Group
Specific Group Name ->  Group Name
```


#### 0.17.1  (ver servinform-galp)
* Work Item
```
NOVOS CAMPOS:
Assigned Group -> $extRef(userm,/userm/group/search?q={{this}})
Assigned Group Name -> $auto.ref(Assigned Group).field(name)

REMOVIDOS:
Group -> $auto.ref(Work Queue).field(Specific Group Name)
```

###### PERMS:
 Acrescentar na permissão de edit de workitems:
```
(
     doc["assigned_group_name.raw"].size() > 0
     && params.user.groups.contains(doc["assigned_group_name.raw"][0])
     )
     ||
     (
     doc["username.raw"].size() > 0
     &&  doc["username.raw"][0] == params.user.username
     )
```
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
