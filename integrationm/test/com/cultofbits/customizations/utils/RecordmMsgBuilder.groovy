package com.cultofbits.customizations.utils

import com.cultofbits.integrationm.service.dictionary.recordm.Definition
import com.cultofbits.integrationm.service.dictionary.recordm.FieldDefinition
import com.cultofbits.integrationm.service.dictionary.recordm.RecordmMsg
import org.apache.commons.lang.math.RandomUtils

class RecordmMsgBuilder {

    def msgBody = [
            user       : null,
            type       : null,
            action     : null,
            instance   : [fields: []],
            oldInstance: [fields: []],
            diff       : [
                    "ADDED"        : [],
                    "VALUE_CHANGED": [],
                    "VALUE_REMOVED": []
            ],
    ]

    static RecordmMsgBuilder aMessage(String user, String type, String action) {
        def builder = new RecordmMsgBuilder()
        builder.msgBody.user = user
        builder.msgBody.type = user
        builder.msgBody.action = user
        return builder
    }

    static RecordmMsgBuilder aMessage(String user, Definition definition, String action) {
        def builder = new RecordmMsgBuilder()
        builder.msgBody.user = user
        builder.msgBody.type = definition.name
        builder.msgBody.action = action
        return builder
    }

    def newField(Definition definition, Integer fieldDefinitionId, String value) {
        assert fieldDefinitionId != null

        def fieldDefinition = definition.getField(fieldDefinitionId)
        assert fieldDefinition != null

        return this.newField(fieldDefinition, null, value)
    }

    def newField(Definition definition, Integer fieldDefinitionId, Long id, String value) {
        assert fieldDefinitionId != null

        def fieldDefinition = definition.getField(fieldDefinitionId)
        assert fieldDefinition != null

        return this.newField(fieldDefinition, id, value)
    }

    def newField(FieldDefinition fieldDefinition, String value) {
        return this.newField(fieldDefinition, null, value)
    }

    def newField(FieldDefinition fieldDefinition, Long id, String value) {
        return newField([fieldDefinition: fieldDefinition, id: id ?: RandomUtils.nextLong(), value: value])
    }

    def newField(Map field) {
        msgBody.instance.fields << field
        msgBody.diff.ADDED << [field: field.fieldDefinition.name, after: field.value]
        return this
    }


    def updatedField(Definition definition, Integer fieldDefinitionId, String newValue, String oldValue) {
        assert fieldDefinitionId != null

        def fieldDefinition = definition.getField(fieldDefinitionId)
        assert fieldDefinition != null

        return this.updatedField(fieldDefinition, null, newValue, oldValue)
    }

    def updatedField(Definition definition, Integer fieldDefinitionId, Long id, String newValue, String oldValue) {
        assert fieldDefinitionId != null

        def fieldDefinition = definition.getField(fieldDefinitionId)
        assert fieldDefinition != null

        return this.updatedField(fieldDefinition, id, newValue, oldValue)
    }

    def updatedField(FieldDefinition fieldDefinition, String newValue, String oldValue) {
        return this.updatedField(fieldDefinition, null, newValue, oldValue)
    }

    def updatedField(FieldDefinition fieldDefinition, Long id, String newValue, String oldValue) {
        return this.updatedField([fieldDefinition: fieldDefinition, id: id ?: RandomUtils.nextLong()], newValue, oldValue)
    }

    def updatedField(Map field, String newValue, String oldValue) {
        msgBody.instance.fields << ([:] << field).with { it.value = newValue; it }
        msgBody.oldInstance.fields << ([:] << field).with { it.value = oldValue; it }
        msgBody.diff.VALUE_CHANGED << [field: field.fieldDefinition.name, after: newValue, before: oldValue]
        return this
    }

    def removedField(Definition definition, Integer fieldDefinitionId, String oldValue) {
        assert fieldDefinitionId != null

        def fieldDefinition = definition.getField(fieldDefinitionId)
        assert fieldDefinition != null

        return this.removedField(fieldDefinition, null, oldValue)
    }

    def removedField(Definition definition, Integer fieldDefinitionId, Long id, String oldValue) {
        assert fieldDefinitionId != null

        def fieldDefinition = definition.getField(fieldDefinitionId)
        assert fieldDefinition != null

        return this.removedField(fieldDefinition, id, oldValue)
    }

    def removedField(FieldDefinition fieldDefinition, String oldValue) {
        return this.removedField(fieldDefinition, null, oldValue)
    }

    def removedField(FieldDefinition fieldDefinition, Long id, String oldValue) {
        return this.removedField([fieldDefinition: fieldDefinition, id: id ?: RandomUtils.nextLong()], oldValue)
    }

    def removedField(Map field, String oldValue) {
        msgBody.oldInstance.fields << ([:] << field).with { it.value = oldValue; it }
        msgBody.diff.VALUE_REMOVED << [field: field.fieldDefinition.name, before: oldValue]
        return this
    }

    RecordmMsg build() {
        new RecordmMsg(msgBody)
    }
}
