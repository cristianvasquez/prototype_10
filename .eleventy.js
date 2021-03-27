module.exports = function (eleventyConfig) {
  const markdownIt = require("markdown-it")
  // const mili = require("markdown-it-linkify-images");
  const markdownItOptions = {
    html: true,
    linkify: true,
  }

  // Map containing 'names' to the full paths of markdown (can be multiple)
  const names_paths = new Map()

  var Plugin = require("markdown-it-regexp")

  var wikilinksImages = Plugin(
    // Detects Obsidian iamges
    /!\[\[([^\!\[\]\|\n\r]+)(\|([^\[\]\|\n\r]+))?\]\]/,

    function (match, utils) {
      var url = "/notes/public/_resources/" + match[1]

      let alt = ""
      if (match[2]) {
        alt = 'alt="' + caption + '"'
      }

      var caption = match[2]

      return `<img src='${url} ${alt}'/>`
    }
  )

  var wikilinks = Plugin(
    // Detects Obsidian links [[Hello]]
    /^\s?\[\[([^\[\]\|\n\r]+)(\|[^\[\]\|\n\r]+)?\s?\]\]/,

    function (match, utils) {
      const parts = match[0].slice(2, -2).split("|")
      parts[0] = parts[0].replace(/.(md|markdown)\s?$/i, "")

      text = (parts[1] || parts[0]).trim()
      url = `/notes/${parts[0].trim()}/`

      markdown_paths = names_paths[parts[0]]

      if (markdown_paths != undefined && markdown_paths.size == 1) {
        // one and only one markdown found
        url = `${markdown_paths.values().next().value.trim()}`
      } else {
        // console.log(names_paths);
        console.log(parts[0], "is unknown")
        // It's an unknown
        url = ""
      }

      return `<a class="internal" data-uuid="${url}" href="${url}">${text}</a>`
    }
  )

  const md = markdownIt(markdownItOptions)
    .use(require("markdown-it-footnote"))
    .use(require("markdown-it-attrs"))
    .use(require("markdown-it-linkify-images"))
    .use(wikilinksImages)
    .use(wikilinks)
  eleventyConfig.addFilter("markdownify", (string) => {
    return md.render(string)
  })

  eleventyConfig.setLibrary("md", md)

  /**
   * Collection 'notes'
   * Will populate the contents of 'notes' with things like backlinks.
   */

  // CollectionAPI https://www.11ty.dev/docs/collections/#getall()
  eleventyConfig.addCollection("notes", function (collectionAPI) {
    let tag = "note"

    let all = collectionAPI.getAll()

    let notes = all.filter(function (item) {
      if ("type" in item.data && item.data["type"] == "note") {
        return true
      }
      return false
    })

    for (note of notes) {
      key = note.fileSlug

      paths = names_paths[key]
      if (paths == undefined) {
        paths = new Set()
      }

      value = note.filePathStem

      paths.add(value)
      names_paths[key] = paths
    }

    console.log(`Processed ${notes.length} notes with tag "${tag}"`)
    return notes
  })

  eleventyConfig.addPassthroughCopy("assets")
  eleventyConfig.addPassthroughCopy("src/notes/public/_resources")

  return {
    useGitIgnore: false,
    dir: {
      input: "src",
      output: "output",
      layouts: "layouts",
      includes: "includes",
      data: "data",
    },
    passthroughFileCopy: true,
  }
}
