let pages = ["notes"]

let switchDirectionWindowWidth = 900

let darkmode = true
function toggleDarkMode() {
  window.localStorage.setItem("darkmode", !darkmode)
  updateDarkMode()
}

function updateDarkMode() {
  darkmode = localStorage.getItem("darkmode") === "true"
  document.body.classList.toggle("dark", darkmode)
}
updateDarkMode()

window.addEventListener("storage", updateDarkMode)

function fetchNote(pageId, level) {
  // The page is already opened
  if (pages.indexOf(pageId) != -1) {
    let page = document.querySelector('.page[data-uuid="' + pageId + '"]')
    // We scroll to the page
    page.scrollIntoView()
    return
  }

  level = Number(level) || pages.length

  // Open the page by id
  const request = new Request(baseurl + "/" + pageId)
  console.log(request)
  fetch(request).then(function (response) {
    response.text().then(function (text) {
      let container = document.querySelector("div.pinch-zoom")
      let children = Array.prototype.slice.call(container.children)

      console.log(children)

      let fragment = document.createElement("template")

      for (let i = level; i < pages.length; i++) {
        container.removeChild(children[i])
        destroyPreviews(children[i])
      }
      pages = pages.slice(0, level)

      fragment.innerHTML = text

      let element = fragment.content.querySelector(".page")

      pages.push(pageId)

      container.appendChild(element)

      setTimeout(
        function (element, level) {
          element.dataset.level = level + 1
          initializePreviews(element, level + 1)
          element.scrollIntoView()
        }.bind(null, element, level),
        10
      )

      updateLinkStatuses()
    })
  })
}

function updateLinkStatuses() {
  let links = Array.prototype.slice.call(
    document.querySelectorAll("a[data-uuid]")
  )

  links.forEach(function (link) {
    if (pages.indexOf(link.dataset.uuid) !== -1) {
      link.classList.add("linked")
      if (link._tippy) link._tippy.disable()
    } else {
      link.classList.remove("linked")
      if (link._tippy) link._tippy.enable()
    }
  })
}

function destroyPreviews(page) {
  links = Array.prototype.slice.call(page.querySelectorAll("a[data-uuid]"))
  links.forEach(function (link) {
    if (link.hasOwnProperty("_tippy")) {
      link._tippy.destroy()
    }
  })
}

let tippyOptions = {
  allowHTML: true,
  theme: "light",
  interactive: true,
  interactiveBorder: 10,
  delay: 100,
  //touch: 'hold',
  touch: "none",
  maxWidth: "none",
  inlinePositioning: false,
  placement: "right",
}

function createPreview(link, overrideOptions) {
  uuid = link.dataset.uuid
  level = Number(link.dataset.level)

  let previewURL = baseurl + "/" + uuid

  tip = tippy(
    link,
    Object.assign(
      {},
      tippyOptions,
      {
        content:
          '<iframe width="400px" height="300px" src="' +
          previewURL +
          '"></iframe>',
      },
      overrideOptions
    )
  )
}

function initializePreviews(page, level) {
  level = level || pages.length

  links = Array.prototype.slice.call(page.querySelectorAll("a[data-uuid]"))

  links.forEach(function (element) {
    //uuid = element.dataset.uuid;
    element.dataset.level = level

    if (element.classList.contains("internal")) {
      createPreview(element, {
        placement:
          window.innerWidth > switchDirectionWindowWidth ? "right" : "top",
      })
    }

    //pages[level-1].tips.push(tip)

    element.addEventListener("click", function (e) {
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault()

        fetchNote(this.dataset.uuid, this.dataset.level)
      }
    })
  })

  privateLinks = Array.prototype.slice.call(
    page.querySelectorAll("a.internal.private")
  )

  privateLinks.forEach(function (element) {
    if (element.classList.contains("internal")) {
      tip = tippy(
        element,
        Object.assign({}, tippyOptions, {
          allowHTML: false,
          content: "The content of this page is private",
          //inlinePositioning: true,
          arrow: false,
          //followCursor: 'initial',
          placement: "top",
        })
      )
    }
  })
}

initializePreviews(document.querySelector(".page"))

let lastWidth = window.innerWidth
window.addEventListener("resize", function (e) {
  if (
    window.innerWidth > switchDirectionWindowWidth !=
    lastWidth > switchDirectionWindowWidth
  ) {
    let pages = [].slice.call(document.querySelectorAll(".page[data-uuid]"))
    pages.forEach(function (page) {
      destroyPreviews(page)
      initializePreviews(page, Number(page.dataset.level))
    })
  }
  lastWidth = window.innerWidth
})

let el, pz
window.onload = function () {
  el = document.querySelector("div.pinch-zoom")
  pz = new PinchZoom(el, {
    use2d: false,
    maxZoom: 1,
    minZoom: 0.1,
    draggableUnzoomed: false,
    onDragUpdate: function (object, event) {
      fixProps(object)
    },
  })

  //pz.setContainerY(window.innerHeight)
  //pz.setContainerX(el.offsetWidth)
  pz.sanitize = function () {}
  pz.zoomOutAnimation = function () {}
  pz.sanitizeOffset = function (offset) {
    return offset
  }
  pz.getInitialZoomFactor = function () {
    return 1
  }
  pz.computeInitialOffset = function () {
    this.initialOffset = { x: 0, y: 0 }
  }
  pz.resetOffset = function () {}
  pz.canDrag = function () {
    return false
  }

  function fixProps(object) {
    object.offset.x = Math.min(object.offset.x, 0)

    object.offset.y =
      -(((1 - object.zoomFactor) * window.innerHeight) / 2) / 1.5
    el.style.setProperty(
      "height",
      window.innerHeight / object.zoomFactor + "px"
    )
  }
  fixProps(pz)
  window.addEventListener("resize", fixProps.bind(null, pz))

  pz.updateAspectRatio()
  pz.setupOffsets()

  window.addEventListener(
    "wheel",
    function (e) {
      if (e.altKey || e.metaKey || e.ctrlKey) {
        prevZoomFactor = pz.zoomFactor
        pz.zoomFactor = Math.max(
          Math.min(pz.zoomFactor + e.deltaY / 2000, 1),
          0.1
        )
        deltaZoomFactor = pz.zoomFactor - prevZoomFactor
        pz.offset.x +=
          deltaZoomFactor / 2 +
          (deltaZoomFactor * el.parentElement.offsetWidth) / 2
        fixProps(pz)
        pz.update()
        e.preventDefault()
      }
    },
    { passive: false }
  )

  pz.offset = { x: 0, y: 0 }
}
