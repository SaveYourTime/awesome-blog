const app = {
  state: {},
  events: {},
  const: {}
};

// Core Operations
app.getElement = (selector) => document.querySelector(selector);
app.getElements = (selector) => document.querySelectorAll(selector);
app.createElement = (tagName, settings = {}, parentElement, childElements) => {
  if (settings === null || undefined) {
    settings = {};
  }
  const { attributes, events } = settings;
  let obj = document.createElement(tagName);
  if (attributes) { app.setAttributes(obj, attributes); }
  if (events) { app.setEventHandlers(obj, events); }
  if (parentElement instanceof Element) { parentElement.appendChild(obj); }
  if (Array.isArray(childElements)) { app.setChildElements(obj, childElements); }
  else if (childElements instanceof Element) { obj.appendChild(childElements); }
  else if ((typeof childElements) === 'string') { obj.textContent = childElements; }
  return obj;
};
app.modifyElement = (obj, settings = {}, parentElement, childElements) => {
  if (settings === null || undefined) {
    settings = {};
  }
  const { attributes, events } = settings;
  if (attributes) { app.setAttributes(obj, attributes); }
  if (events) { app.setEventHandlers(obj, events); }
  if (parentElement instanceof Element && parentElement !== obj.parentNode) { parentElement.appendChild(obj); }
  if (Array.isArray(childElements)) { app.setChildElements(obj, childElements); }
  else if (childElements instanceof Element) { obj.appendChild(childElements); }
  else if ((typeof childElements) === 'string') { obj.textContent = childElements; }
  return obj;
};
app.setAttributes = (obj, attributes) => {
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'class') {
      value.split(' ').forEach((v) => {
        obj.classList.add(v);
      });
    } else {
      obj.setAttribute(key, value);
    }
  });
  return obj;
};
app.setEventHandlers = (obj, eventHandlers, useCapture = false) => {
  Object.entries(eventHandlers).forEach(([key, value]) => {
    if (value instanceof Array) {
      value.forEach((event) => {
        obj.addEventListener(key, event, useCapture);
      });
    } else {
      obj.addEventListener(key, value, useCapture);
    }
  });
  return obj;
};
app.setChildElements = (obj, childElements) => {
  childElements.forEach((childElement) => {
    obj.appendChild(childElement);
  });
  return obj;
}
app.removeChilds = (element) => {
  while (element.hasChildNodes()) {
    element.removeChild(element.firstChild);
  }
}

// Helper Functions
app.convertDate = (() => {
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZone: 'Asia/Taipei',
    hour12: false
  };
  return (date) => date.toLocaleDateString('zh-Hans-TW', options);
})();