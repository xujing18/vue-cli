/* global HTMLElement */

import Vue from 'vue'
import Component from '~entry'

// Name to register the custom element as. Must contain a hyphen.
const name = process.env.CUSTOM_ELEMENT_NAME

// Whether to keep the instance alive when element is removed from DOM.
// Default: false.
// - false: the instance is destroyed and recreated when element is removed / reinserted
// - true: the instance is always kept alive
const keepAlive = process.env.CUSTOM_ELEMENT_KEEP_ALIVE

const options = typeof Component === 'function'
  ? Component.options
  : Component

const arrToObj = (arr, defaultValue) => arr.reduce((acc, key) => {
  acc[key] = defaultValue
  return acc
}, {})

const props = Array.isArray(options.props)
  ? arrToObj(options.props, {})
  : options.props || {}
const propsList = Object.keys(props)

// CSS injection function exposed by vue-loader & vue-style-loader
const styleInjectors = window[options.__shadowInjectId]
const injectStyle = root => styleInjectors.forEach(inject => inject(root))

// TODO use ES5 syntax
class CustomElement extends HTMLElement {
  static get observedAttributes () {
    return propsList
  }

  constructor () {
    super()

    const data = arrToObj(propsList)
    data._active = false
    this._wrapper = new Vue({
      data,
      render: h => data._active
        ? h(Component, { props: this._data })
        : null
    })

    this._attached = false
    this._shadowRoot = this.attachShadow({ mode: 'open' })
    injectStyle(this._shadowRoot)
  }

  connectedCallback () {
    this._attached = true
    if (!this._wrapper._isMounted) {
      this._wrapper.$mount()
      this._shadowRoot.appendChild(this._wrapper.$el)
    }
    this._wrapper._data._active = true
  }

  disconnectedCallback () {
    this._attached = false
    const destroy = () => {
      this._wrapper._data._active = false
    }
    if (!keepAlive) {
      destroy()
    } else if (typeof keepAlive === 'number') {
      setTimeout(() => {
        if (!this._attached) destroy()
      }, keepAlive)
    }
  }

  attributeChangedCallback (attrName, oldVal, newVal) {
    this._wrapper._data[attrName] = newVal
  }
}

propsList.forEach(key => {
  Object.defineProperty(CustomElement.prototype, key, {
    get () {
      return this._wrapper._data[key]
    },
    set (newVal) {
      this._wrapper._data[key] = newVal
    },
    enumerable: false,
    configurable: true
  })
})

window.customElements.define(name, CustomElement)
