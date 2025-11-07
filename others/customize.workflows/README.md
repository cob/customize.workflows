# COB Workflow

## Install

`cob-cli customize workflow`

---

## Warning

Up until version 1.5.0, this customization imported axios and make it globally available to all JS customizations in the machine. The way this dependency is imported has been changed, so when updating workflows on older machines, we recommend
loading the axios dependency inside a `cob.custom.customize.push` with the following snippet:
```
utils.loadScript("localresource/js/lib/axios.min.js", function() {});
```

---

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
||
(doc["visibility_group_name.raw"].size() > 0 && params.user.groups.contains(doc["visibility_group_name.raw"][0]))
||
(doc["visibility_user_username.raw"].size() > 0 && doc["visibility_user_username.raw"].stream().anyMatch(u -> params.user.username == u))

instances:update:<def_id_work_item>:
(doc["assigned_group_name.raw"].size() > 0 && params.user.groups.contains(doc["assigned_group_name.raw"][0]))
||
(doc["username.raw"].stream().anyMatch(u -> params.user.username == u))

```

### Definition Upgrades:

#### 1.12

* Work Queue
  
```
NOVOS:
Execution Info > Execution Output : $text
```

#### 1.6

* Work Queue
  
```
NOVOS:
(Placed in the current position of "Done Conditions" - between "Launch Condition" and "On Done")
Work Specification > Possible States >  Condition : $group $expanded (Duplicable)

ALTERADOS:
(For retro-compatibility these should be MOVED, and not deleted and created again)
Work Specification > Possible States > Condition > Done Conditions : $text Conditions that need to be met in order for Done to be possible
Work Specification > Possible States > Condition > Done Conditions Error Msg : $text Friendly text to present when conditions are not met
```

#### 1.5

* Business Process
  
```
ALTERADOS:
Details: __Full Name__  : $group -> $group $style[grupo]
Specific Data : Definition Name for the associated data -> $help[Definition Name for the associated data]
State Field: Name of the field in the Specific Data Definition that is used as a state by the process -> $help[Name of the field in the Specific Data Definition that is used as a state by the process]
Groups: The Groups that can see this business process -> $help[The Groups that can see this business process]

Removidos:
Visibility: $group $style[subgroup] $expanded 
(The children of this field are now inline with the rest)
```

* Work Queue

```
ALTERADOS:
Work Identification : $group -> Work Scope: __Business Process Name__ | __Specific Data__ : $group $style[grupo,hide-inline]
Agent Type : $[*Human,RPA,AI,Wait]  $instanceDescription $expanded $groupEdit $styleResultColumn(Human:BgDimBlue,RPA:BgDimGreen,AI:BgDimOrange,Wait:BgDimGreen) -> $[*Human,RPA,AI,Wait]  $instanceDescription $expanded $groupEdit $styleResultColumn(Human:BgDimBlue,RPA:BgDimGreen,AI:BgDimOrange,Wait:BgGreen) $style[children-mx-0, children-border-0, children-bg-none]
Agent Type [=Human] > Human Type : $[*Group,Group Field,User,User Field] $expanded $groupEdit -> $[*Group,Group Field,User,User Field] $expanded $groupEdit $style[children-mx-0, children-border-0, children-bg-none]
Agent Type [=Human] > Human Type [=Group Field] > Group Field : $groupEdit Identifies the field with the group value from customer data instance. This field should be an \\$extRef pointing to UserM -> $groupEdit $help[Identifies the field with the group value from customer data instance. This field should be an \\$extRef pointing to UserM] 
Agent Type [=Human] > Human Type [=User Field] > User Field : $groupEdit Identifies the field with the user value from customer data instance. This field should be an \\$extRef pointing to UserM -> $groupEdit $help[Identifies the field with the user value from customer data instance. This field should be an \\$extRef pointing to UserM]
Possible States : $[To Assign,To Do,In Progress,Done,Pending,Error,Canceled] $multiple $style[radio-1line] $expanded -> $[To Assign,To Do,In Progress,Done,Pending,Error,Canceled] $multiple $style[radio-1line] $expanded  $style[children-mx-0, children-border-0, children-bg-none]
Work Items : $group $style[use-reference-count,grupo] -> $group $style[use-reference-count,hide-in-new-instance,grupo] $restricted(System)
Business Process now  *Mandatory* 
"Name" and "Code" moved into "Work Specification"

NOVOS:
Visibility Type : $groupEdit $[Group,Group Field,User,User Field] $expanded $groupEdit $style[children-mx-0, children-border-0, children-bg-none]
Visibility Type [=Group] > Visibility Group : $extRef(userm,/userm/group/search?q={{this}}) $groupEdit 
Visibility Type [=Group] > Visibility Group > Visibility Group Name : $auto.ref(Visibility Group).field(name) $style[hide]
Visibility Type [=Group Field] > Visibility Group Field : $groupEdit $help[Identifies the field with the visibility group value from customer data instance. This field should be an \\$extRef pointing to UserM]
Visibility Type [=User] > Visibility User : $extRef(userm,/userm/user/search?q={{this}}) $groupEdit
Visibility Type [=User] > Visibility User > Visibility User Username : $auto.ref(Visibility User).field(username) $style[hide]
Visibility Type [=User Field] > Visibility User Field : $groupEdit $help[Identifies the field with the visibility user value from customer data instance. This field should be an \\$extRef pointing to UserM]
```

* Work Item

```
ALTERADOS
Execution Status : $group $expanded(id!=-1) $style[hide-in-new-instance] -> $group $expanded(id!=-1) $style[grupo,hide-in-new-instance]
Execution Status > Customer Data Definition : $auto.ref(Customer Data).field(definitionName) $style[hide-inline] -> $auto.ref(Customer Data).field(definitionName) $style[hide-inline] $editForGroup(System) 
Execution Status > Customer Data : $ref(Work Queues,*) $readonly $alert(a def é uma qualquer só para conseguirmos ter o ref; o instanceId será preenchido por quem criar o WI) $style[hide-inline] -> $ref(Work Queues,*) $alert(a def é uma qualquer só para conseguirmos ter o ref; o instanceId será preenchido por quem criar o WI) $style[hide-inline] $editForGroup(System) $instanceDescription
Execution Status > Main Customer Data : $ref(Work Queues,*) $readonly $alert(a def é uma qualquer só para conseguirmos ter o ref; o instanceId será preenchido por quem criar o WI) $style[hide-inline] -> $ref(Work Queues,*) $alert(a def é uma qualquer só para conseguirmos ter o ref; o instanceId será preenchido por quem criar o WI) $style[hide-inline] $editForGroup(System) 
Execution Status > State: $[To Assign,To Do,In Progress,Done,Pending,Error,Canceled] $instanceDescription $groupEdit  $styleResultRows(Done:bg-neutral-200,Canceled:bg-neutral-200) $styleResultColumn(To Assign:BgDimOrange,To Do:BgDimBlue,In Progress:BgDimBlue,Pending:BgDimOrnage,Done:Green,Canceled:Gray,Error:Red) -> $[To Assign,To Do,In Progress,Done,Pending,Error,Canceled] $instanceDescription $groupEdit $styleResultColumn(To Assign:BgDimOrange,To Do:BgDimBlue,In Progress:BgDimBlue,Pending:BgDimOrnage,Done:Green,Canceled:Gray,Error:Red) 
Execution Status > User: $instanceDescription $extRef(userm,/userm/user/search?q={{this}}*) $groupEdit $styleResultColumn(/userm/user/36:DimGray) -> $instanceDescription $extRef(userm,/userm/user/search?q={{this}}*) $groupEdit $styleResultColumn(/userm/user/36:DimGray) $editForGroup(System) 
Execution Status > Assigned Group: $extRef(userm,/userm/group/search?q={{this}}) -> $extRef(userm,/userm/group/search?q={{this}}) $editForGroup(System) 
Execution Status [State=Error] > Automation Errors: $text -> $text $editForGroup(System) 
Business Process & Work Queue: $group $expanded(id=-1) -> $group $expanded(id=-1) $style[grupo]
Business Process & Work Queue > Work Queue: $ref(Work Queues, specific_data:__Customer Data Definition__) $instanceDescription -> $ref(Work Queues, specific_data:__Customer Data Definition__) $instanceDescription  $editForGroup(System) 
Business Process & Work Queue > Agent Type: $auto.ref(Work Queue).field(Agent Type) -> $auto.ref(Work Queue).field(Agent Type)  $styleResultColumn(Human:BgDimBlue,RPA:BgDimGreen,AI:BgDimOrange,Wait:BgGreen)
Business Process & Work Queue > Main Business Process : $ref(Business Processes,*) $auto.ref(Business Process).field(Level 1) $editForGroup(System) -> $ref(Business Processes,*) $auto.ref(Business Process).field(Level 1)
Execution Info: $group $style[hide-in-new-instance] -> $group $style[grupo,hide-in-new-instance]
Execution Info > Users > User of Done : $extRef(userm,/userm/user/search?q={{this}}*) $groupEdit  $styleResultColumn(/userm/user/36:DimGray) -> $extRef(userm,/userm/user/search?q={{this}}*) $groupEdit  $styleResultColumn(/userm/user/36:DimGray) $editForGroup(System) 
Execution Info > Users > Done by Assignee : $[Yes,No] -> $[Yes,No] $editForGroup(System) 
Execution Info > Users > Self Assigned : $[Yes,No] -> $[Yes,No] $editForGroup(System) 
Execution Info > Dates > Date of Request: $datetime $default(now) $instanceDescription $style[dateDiffBefore] -> $datetime $default(now) $instanceDescription $style[dateDiffBefore] $editForGroup(System) 
Execution Info > Dates > Date of Creation: $datetime $default(now) -> $datetime $default(now) $editForGroup(System) 
Execution Info > Dates > Date of Assignment: $datetime -> $datetime $editForGroup(System) 
Execution Info > Dates > Date of Start: $datetime -> $datetime $editForGroup(System) 
Execution Info > Dates > Date of first Pending: $datetime -> $datetime $editForGroup(System) 
Execution Info > Dates > Date of Pending: $datetime -> $datetime $editForGroup(System) 
Execution Info > Dates > Date of Done: $datetime -> $datetime $editForGroup(System) 
Execution Info > Dates > Date of Canceling: $datetime -> $datetime $editForGroup(System) 
Execution Info > Times > Time of Execution: $number(3) -> $number(3) $editForGroup(System) 
Execution Info > Times > Time Overall: $number(3) -> $number(3) $editForGroup(System) 
Execution Info > Times > Time of Assignment: $number(3) -> $number(3) $editForGroup(System) 
Execution Info > Times > Time of Start: $number(3) -> $number(3) $editForGroup(System) 
Execution Info > Times > Time of Pending: $number(3) -> $number(3) $editForGroup(System) 
Execution Info > Output: $text -> $text $editForGroup(System)

NOVOS:
Execution Status > Visibility User: $extRef(userm,/userm/user/search?q={{this}}*) $groupEdit $editForGroup(System) 
Execution Status > Visibility User > Visibility User Username: $auto.ref(Visibility User).field(username)
Execution Status > Visibility Group: $extRef(userm,/userm/group/search?q={{this}}) $editForGroup(System) 
Execution Status > Visibility Group > Visibility Group Name: $auto.ref(Visibility Group).field(name)
Business Process & Work Queue > Work Queue > Visibility Type : $auto.ref(Work Queue).field(Visibility Type) $expanded
```

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
