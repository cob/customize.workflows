package com.cultofbits.customizations.utils


import com.cultofbits.integrationm.service.dictionary.recordm.FieldDefinition
import org.apache.commons.lang.math.RandomUtils

class FieldDefinitionBuilder {

    private FieldDefinition fieldDefinition = new FieldDefinition();

    static FieldDefinitionBuilder aFieldDefinition() {
        def builder = new FieldDefinitionBuilder()
        return builder
    }

    static FieldDefinitionBuilder aFieldDefinition(id, name, description, boolean required, boolean duplicable, FieldDefinitionBuilder... childFields) {
        def builder = new FieldDefinitionBuilder()
        builder.fieldDefinition.id = id
        builder.fieldDefinition.name = name
        builder.fieldDefinition.description = description
        builder.fieldDefinition.required = required
        builder.fieldDefinition.duplicable = duplicable
        builder.fieldDefinition.fields = childFields.collect { cfb -> cfb.build() }.collect { cf -> cf.rootField = false; cf }

        return builder
    }

    def id(Integer id) {
        fieldDefinition.id = id
        return this
    }

    def name(String name) {
        fieldDefinition.name = name
        return this
    }

    def description(String description) {
        this.fieldDefinition.description = description
        return this
    }

    def required(boolean required) {
        fieldDefinition.required = required
        return this
    }

    def duplicable(boolean duplicable) {
        fieldDefinition.duplicable = duplicable
        return this
    }

    def childFields(FieldDefinition... childFields) {
        fieldDefinition.fields = childFields
        return this
    }

    def childFields(FieldDefinitionBuilder... childFields) {
        fieldDefinition.fields = childFields.collect { cf -> cf.build() }
        return this
    }

    FieldDefinition build() {
        fieldDefinition.with {
            it.id = it.id ?: RandomUtils.nextInt()
            it.name = it.name ?: "field-definition-${it.id}"
            it.fields = it.fields ?: []
            it
        }
    }
}
