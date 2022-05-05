/**
 * @typedef {import('./types').ClickToComponentProps} Props
 * @typedef {import('./types').Coords} Coords
 */

import { FloatingPortal } from '@floating-ui/react-dom-interactions'
import { html } from 'htm/react'
import * as React from 'react'

import { ContextMenu } from './ContextMenu.js'
import { getPathToSource } from './getPathToSource.js'
import { getSourceForElement } from './getSourceForElement.js'

export const State = /** @type {const} */ ({
  IDLE: 'IDLE',
  HOVER: 'HOVER',
  SELECT: 'SELECT',
})

/**
 * @param {Props} props
 */
export function ClickToComponent({ editor = 'vscode' }) {
  const localStorageKey = 'clickToComponentEditorUsed'
  const [IDE, setIDE] = React.useState(localStorage.getItem(localStorageKey) || editor)
  const [state, setState] = React.useState(
    /** @type {State[keyof State]} */
    (State.IDLE)
  )

  const [target, setTarget] = React.useState(
    /** @type {HTMLElement | null} */
    (null)
  )

  const onClick = React.useCallback(
    function handleClick(
      /**
       * @type {MouseEvent}
       */
      event
    ) {
      if (state === State.HOVER && target instanceof HTMLElement) {
        const source = getSourceForElement(target)
        if (source) {
          const path = getPathToSource(source)
          event.preventDefault()
          openFileInIDE(path)
          setState(State.IDLE)
        }
      }
    },
    [IDE, state, target]
  )

  const onClose = React.useCallback(
    function handleClose(returnValue) {
      if (returnValue) {
        openFileInIDE(returnValue)
      }
      setState(State.IDLE)
    },
    [IDE]
  )

  const onChangeIDE = () => {
    const value = prompt("What editor do you use ? vscode | vscode-insiders | intellij\n\ninfo: intellij need to be open before", IDE)
    localStorage.setItem(localStorageKey, value)
    setIDE(value)
  }

  const openFileInIDE = (file) => {
    if (IDE === 'intellij') {
      const url = `http://localhost:63342/api/file/${file}`
      const cmd = window.open(url)
      setTimeout(function() {
        cmd.close()
      }, 100)
    } else {
      const url = `${IDE}://file/${file}`
      window.open(url)
    }
  }

  const onContextMenu = React.useCallback(
    function handleContextMenu(
      /**
       * @type {MouseEvent}
       */
      event
    ) {
      const { target } = event

      if (state === State.HOVER && target instanceof HTMLElement) {
        event.preventDefault()

        setState(State.SELECT)
        setTarget(target)
      }
    },
    [state]
  )

  const onKeyDown = React.useCallback(
    function handleKeyDown(
      /**
       * @type {KeyboardEvent}
       */
      event
    ) {
      switch (state) {
        case State.IDLE:
          if (event.altKey) setState(State.HOVER)
          break

        default:
      }
    },
    [state]
  )

  const onKeyUp = React.useCallback(
    function handleKeyUp(
      /**
       * @type {KeyboardEvent}
       */
      event
    ) {
      switch (state) {
        case State.HOVER:
          setState(State.IDLE)
          break

        default:
      }
    },
    [state]
  )

  const onMouseMove = React.useCallback(
    function handleMouseMove(
      /** @type {MouseEvent} */
      event
    ) {
      if (!(event.target instanceof HTMLElement)) {
        return
      }

      switch (state) {
        case State.IDLE:
        case State.HOVER:
          setTarget(event.target)
          break

        default:
          break
      }
    },
    [state]
  )

  React.useEffect(
    function toggleIndicator() {
      for (const element of Array.from(
        document.querySelectorAll('[data-click-to-component-target]')
      )) {
        if (element instanceof HTMLElement) {
          delete element.dataset.clickToComponentTarget
        }
      }

      if (state === State.IDLE) {
        delete window.document.body.dataset.clickToComponentTarget
        return
      }

      if (target instanceof HTMLElement) {
        window.document.body.dataset.clickToComponent = state
        target.dataset.clickToComponentTarget = state
      }
    },
    [state, target]
  )

  React.useEffect(
    function addEventListenersToWindow() {
      window.addEventListener('click', onClick, { capture: true })
      window.addEventListener('contextmenu', onContextMenu, { capture: true })
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)
      window.addEventListener('mousemove', onMouseMove)

      return function removeEventListenersFromWindow() {
        window.removeEventListener('click', onClick, { capture: true })
        window.removeEventListener('contextmenu', onContextMenu, {
          capture: true,
        })
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('keyup', onKeyUp)
        window.removeEventListener('mousemove', onMouseMove)
      }
    },
    [onClick, onContextMenu, onKeyDown, onKeyUp, onMouseMove]
  )

  return html`
    <style key="click-to-component-style">
      [data-click-to-component] * {
        pointer-events: auto !important;
      }

      [data-click-to-component-target] {
        cursor: var(--click-to-component-cursor, context-menu) !important;
        outline: var(
          --click-to-component-outline,
          2px solid lightgreen
        ) !important;
        outline-offset: -2px;
        outline-style: inset;
      }
    </style>

    <${FloatingPortal} key="click-to-component-portal">
      ${html`<${ContextMenu}
        key="click-to-component-contextmenu"
        IDE=${IDE}
        onClose=${onClose}
        onChangeIDE=${onChangeIDE}
      />`}
    </${FloatingPortal}
  `
}
