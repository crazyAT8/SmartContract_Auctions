/**
 * Convert a Joi schema to an OpenAPI 3 schema object via Joi.describe().
 * Keeps request-body docs aligned with validators in validation.js.
 */

function joiToOpenApi(joiSchema) {
  if (!joiSchema || typeof joiSchema.describe !== 'function') {
    throw new Error('joiToOpenApi expects a Joi schema');
  }
  return convertNode(joiSchema.describe());
}

function convertNode(node) {
  if (!node || !node.type) {
    return {};
  }

  switch (node.type) {
    case 'object':
      return convertObject(node);
    case 'string':
      return convertString(node);
    case 'number':
      return convertNumber(node);
    case 'boolean':
      return { type: 'boolean', ...(node.flags?.default !== undefined && { default: node.flags.default }) };
    case 'array':
      return convertArray(node);
    case 'alternatives':
      return convertAlternatives(node);
    case 'any':
      return {};
    default:
      return { type: node.type };
  }
}

function convertObject(node) {
  const properties = {};
  const required = [];
  const keys = node.keys || {};

  for (const [key, child] of Object.entries(keys)) {
    properties[key] = convertNode(child);
    if (child.flags?.presence === 'required') {
      required.push(key);
    }
  }

  const schema = {
    type: 'object',
    properties
  };
  if (required.length > 0) {
    schema.required = required;
  }
  return schema;
}

function convertString(node) {
  const schema = { type: 'string' };

  if (node.flags?.presence === 'required') {
    // presence is handled at object level; keep for standalone use
  }

  const rules = node.rules || [];
  for (const rule of rules) {
    switch (rule.name) {
      case 'min':
        schema.minLength = rule.args?.limit;
        break;
      case 'max':
        schema.maxLength = rule.args?.limit;
        break;
      case 'length':
        schema.minLength = rule.args?.limit;
        schema.maxLength = rule.args?.limit;
        break;
      case 'pattern':
      case 'regex': {
        const regex = rule.args?.regex;
        if (regex instanceof RegExp) {
          schema.pattern = regex.source;
        } else if (typeof regex === 'string') {
          const match = regex.match(/^\/(.+)\/[gimsuy]*$/);
          schema.pattern = match ? match[1] : regex;
        }
        break;
      }
      case 'uri':
        schema.format = 'uri';
        break;
      case 'email':
        schema.format = 'email';
        break;
      default:
        break;
    }
  }

  if (node.allow) {
    const enums = node.allow.filter((v) => v !== null && v !== '');
    if (enums.length > 0 && enums.every((v) => typeof v === 'string' || typeof v === 'number')) {
      schema.enum = enums;
    }
  }

  // Joi .valid() shows up as allow list
  if (Array.isArray(node.flags?.only) === false && node.allow && node.flags?.only) {
    // handled above via allow
  }

  return schema;
}

function convertNumber(node) {
  const schema = { type: 'number' };
  const rules = node.rules || [];

  for (const rule of rules) {
    switch (rule.name) {
      case 'integer':
        schema.type = 'integer';
        break;
      case 'min':
        schema.minimum = rule.args?.limit;
        break;
      case 'max':
        schema.maximum = rule.args?.limit;
        break;
      default:
        break;
    }
  }

  if (node.allow) {
    const enums = node.allow.filter((v) => typeof v === 'number');
    if (enums.length > 0) {
      schema.enum = enums;
    }
  }

  return schema;
}

function convertArray(node) {
  const schema = { type: 'array' };
  const items = node.items || [];
  if (items.length === 1) {
    schema.items = convertNode(items[0]);
  } else if (items.length > 1) {
    schema.items = { oneOf: items.map(convertNode) };
  }
  return schema;
}

function convertAlternatives(node) {
  const matches = node.matches || [];
  const schemas = matches
    .map((m) => m.schema && convertNode(m.schema))
    .filter(Boolean);
  if (schemas.length === 0) return {};
  if (schemas.length === 1) return schemas[0];
  return { oneOf: schemas };
}

module.exports = { joiToOpenApi };
