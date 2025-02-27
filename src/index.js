var verbosityOn = process.env.NODE_ENV === 'development';

const initialHandlers = {
  effects: {},
  coeffects: {},
  events: {}
};

let handlers = { ...initialHandlers };
let coeffectsByEvent = {};

function logEvent({ id, payload }) {
  if (verbosityOn) {
    console.groupCollapsed(`Dispatching event: ${id}`);
    console.info('EventId:', id);
    if (!payload) {
      console.info('Payload:', `The ${id} event has no payload.`);
    } else {
      console.info('Payload:', payload);
    }
    console.groupEnd();
  }
}

function logCoeffect({id, data}, value) {
  if (verbosityOn) {
    console.groupCollapsed(`Extracting values of coeffect: ${id}`);
    console.info('Coeffect id:', id);
    if(!data) {
      console.info('Coeffect data:', `The ${id} coeffect needs no data`);
    } else {
      console.info('Coeffect data:', data);
    }
    console.info('Extracted value:', value);
    console.groupEnd();
  }
}

function logEffect(effectId, effectData) {
  if (verbosityOn) {
    console.groupCollapsed(`Applying effect: ${effectId}`);
    console.info('Effect id:', effectId);
    if (!effectData) {
      console.info('Effect data:', `The ${effectId} effect needs no data`);
    } else {
      console.info('Effect data:', effectData);  
    }
    console.groupEnd();
  }
}

function normalizeCoeffectDescription(coeffectDescription) {
  if (isString(coeffectDescription)) {
    return {id:coeffectDescription};
  }
  return coeffectDescription;
}

function extractCoeffectValue(coeffectDescription) {
  checkElementValidity(coeffectDescription, "coeffect");
  const normalizedCoeffectDescription = normalizeCoeffectDescription(coeffectDescription);
  const coeffectHandler = getCoeffectHandler(normalizedCoeffectDescription.id);
  const value = coeffectHandler(normalizedCoeffectDescription.data);
  logCoeffect(normalizedCoeffectDescription, value);
  return value;
}

function extractCoeffectsValues(coeffectDescriptions) {
  return coeffectDescriptions.reduce(
    function(acc, coeffectDescription) {
      return Object.assign({}, acc, extractCoeffectValue(coeffectDescription));
    }, 
    {}
  );
}

function applyEffects(effects) {
  if (!effects) {
    return;
  }
  Object.entries(effects).forEach(
    function([effectId, effectData]) {
      logEffect(effectId, effectData);
      const effectHandler = getEffectHandler(effectId);
      effectHandler(effectData);
    }
  );
}

function normalizeEvent(event) {
  if(isString(event)) {
    return {id: event};
  }
  return event;
}

export function dispatch(event) {
  checkElementValidity(event, "event");
  const normalizedEvent = normalizeEvent(event);
  logEvent(normalizedEvent);
  const { id, payload } = normalizedEvent;
  const eventHandler = getEventHandler(id);
  const coeffectDescriptions = coeffectsByEvent[id];
  const coeffects = extractCoeffectsValues(coeffectDescriptions);
  const effects = eventHandler(coeffects, payload);
  applyEffects(effects);
}

export function dispatchMany(events) {
  events.forEach(function(event) {
    dispatch(event);
  });
}

function dispatchLater(event) {
  setTimeout(function() {
    dispatch(event);
  }, event.milliseconds);
}

export function registerEventHandler(
  eventId,
  handler,
  coeffectDescriptions = []
) {
  setHandler('events', eventId, handler);
  coeffectsByEvent[eventId] = coeffectDescriptions;
}

export function registerCoeffectHandler(coeffectId, handler) {
  setHandler('coeffects', coeffectId, handler);
}

export function registerEffectHandler(effectId, handler) {
  setHandler('effects', effectId, handler);
}

export function registerEventsDelegation(originalEvents, targetEvent) {
  originalEvents.forEach(function(id) {
    registerEventHandler(id, function(coeffects, payload) {
      return {
        dispatch: { id: targetEvent, payload: payload }
      };
    });
  });
}

registerEffectHandler('dispatch', function dispatchEffect(event) {
  dispatch(event);
});

registerEffectHandler('dispatchMany', function dispatchManyEffect(events) {
  dispatchMany(events);
});

registerEffectHandler('dispatchLater', function dispatchLaterEffect(event) {
  dispatchLater(event);
});

function getHandler(handlerType, handlerId) {
  const handler = handlers[handlerType][handlerId];
  if (!handler) {
    throw new Error(`There is no handler called '${handlerId}'.`);
  }
  return handler;
}

export function coeffect(id, data) {
  if (!data) {
    return id;
  }
  return { id: id, data: data };
}

function setHandler(handlerType, handlerId, handler) {
  handlers[handlerType][handlerId] = handler;
}

export function getCoeffectHandler(coeffectId) {
  return getHandler('coeffects', coeffectId);
}

export function getEffectHandler(effectId) {
  return getHandler('effects', effectId);
}

export function getEventHandler(eventId) {
  return getHandler('events', eventId);
}

export function clearHandlers() {
  handlers = { ...initialHandlers };
  coeffectsByEvent = {};
}

export function setVerbosity(newValue) {
  verbosityOn = newValue;
}

const toString = Object.prototype.toString;

function isString(value) {
  const type = typeof value;
  return (
    type === 'string' ||
    (type === 'object' &&
      value != null &&
      !Array.isArray(value) &&
      toString.call(value) === '[object String]')
  );
}

function checkElementValidity(element, elementType) {
  const shapeDescriptionsByElement = {
    "coeffect": "It must be an object with the following format `{ id: 'COEFFECT_ID', data: <Object | any> }`, or a string if no data is needed: 'EVENT_ID'",
    "event": "It must be an object with the following format `{ id: 'EVENT_ID', payload: <Object | any> }`, or a string if no payload is needed: 'EVENT_ID'",
  };

  if (!element) {
    throwNotDefinedError(elementType);
  }

  if(!isString(element) && element.id == null) {
    throwNotValidError(elementType);
  }

  function throwNotDefinedError(element) {
    throw new Error("Not defined " + element + ".\n" + shapeDescriptionsByElement[element]);
  }

  function throwNotValidError(element) {
    throw new Error("Not valid " + element + ".\n" + shapeDescriptionsByElement[element]);
  }
}
