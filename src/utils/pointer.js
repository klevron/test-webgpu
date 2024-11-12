import { Vector2 } from 'three'

const elementsMap = new Map()

const pPosition = new Vector2()

let listeners = false

export default function (params) {
  const obj = {
    position: new Vector2(),
    nPosition: new Vector2(),
    hover: false,
    onEnter () {},
    onMove () {},
    onClick () {},
    onLeave () {},
    ...params
  }

  addElement(params.domElement, obj)

  obj.dispose = () => {
    removeElement(params.domElement)
  }

  return obj
}

function addElement (el, obj) {
  if (!elementsMap.has(el)) {
    elementsMap.set(el, obj)
    if (!listeners) addListeners()
  }
}

function removeElement (el) {
  elementsMap.delete(el)
  if (elementsMap.size === 0) {
    removeListeners()
  }
}

function pointerMove (ev) {
  pPosition.x = ev.clientX
  pPosition.y = ev.clientY
  for (const [el, obj] of elementsMap) {
    const rect = el.getBoundingClientRect()
    if (isHover(rect)) {
      updatePositions(obj, rect)
      if (!obj.hover) {
        obj.hover = true
        obj.onEnter(obj)
        // console.log('onEnter')
      }
      obj.onMove(obj)
    } else {
      if (obj.hover) {
        obj.hover = false
        obj.onLeave(obj)
        // console.log('onLeave')
      }
    }
  }
}

function onClick (ev) {
  pPosition.x = ev.clientX
  pPosition.y = ev.clientY
  for (const [el, obj] of elementsMap) {
    const rect = el.getBoundingClientRect()
    updatePositions(obj, rect)
    if (isHover(rect)) {
      obj.onClick(obj)
    }
  }
}

function pointerLeave () {
  for (const obj of elementsMap.values()) {
    if (obj.hover) {
      obj.hover = false
      obj.onLeave(obj)
      // console.log('onLeave')
    }
  }
}

function updatePositions (obj, rect) {
  const { position, nPosition } = obj
  position.x = pPosition.x - rect.left
  position.y = pPosition.y - rect.top
  nPosition.x = (position.x / rect.width) * 2 - 1
  nPosition.y = -(position.y / rect.height) * 2 + 1
}

function isHover (rect) {
  const { x, y } = pPosition
  const { left, top, width, height } = rect
  return x >= left && x <= left + width && y >= top && y <= top + height
}

function addListeners () {
  // console.log('addListeners')
  document.body.addEventListener('pointermove', pointerMove)
  document.body.addEventListener('pointerleave', pointerLeave)
  document.body.addEventListener('click', onClick)
  listeners = true
}

function removeListeners () {
  // console.log('removeListeners')
  document.body.removeEventListener('pointermove', pointerMove)
  document.body.removeEventListener('pointerleave', pointerLeave)
  listeners = false
}
