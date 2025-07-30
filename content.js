document.addEventListener("DOMContentLoaded", function () {
  if (typeof CryptoJS === "undefined") {
    console.error("CryptoJS is not loaded")
    return
  }

  const currentUrl = window.location.hostname
  chrome.storage.local.get(["credentials"], function (result) {
    const credentials = result.credentials || []
    const matchingCredentials = credentials.filter(
      (cred) => cred.url === currentUrl
    )

    if (matchingCredentials.length > 0) {
      const forms = document.querySelectorAll("form")
      forms.forEach((form) => {
        const inputs = form.querySelectorAll("input")
        let usernameInput = null
        let passwordInput = null

        inputs.forEach((input) => {
          if (input.type === "text" || input.type === "email") {
            usernameInput = input
          }
          if (input.type === "password") {
            passwordInput = input
          }
        })

        if (usernameInput && passwordInput) {
          const cred = matchingCredentials[0]
          usernameInput.value = cred.username
          passwordInput.value = CryptoJS.AES.decrypt(
            cred.password,
            "secret-key-123"
          ).toString(CryptoJS.enc.Utf8)
          console.log("Autofilled credentials for", currentUrl)
        }
      })
    }
  })
})

document.addEventListener("submit", function (e) {
  if (typeof CryptoJS === "undefined") {
    console.error("CryptoJS is not loaded")
    return
  }
  const form = e.target
  const inputs = form.querySelectorAll("input")
  let username = ""
  let password = ""

  inputs.forEach((input) => {
    if (input.type === "text" || input.type === "email") {
      username = input.value
    }
    if (input.type === "password") {
      password = input.value
    }
  })

  if (username && password) {
    const currentUrl = window.location.hostname
    chrome.storage.local.get(["credentials"], function (result) {
      const credentials = result.credentials || []
      const isDuplicate = credentials.some(
        (cred) =>
          cred.url === currentUrl &&
          cred.username === username &&
          CryptoJS.AES.decrypt(cred.password, "secret-key-123").toString(
            CryptoJS.enc.Utf8
          ) === password
      )

      if (!isDuplicate) {
        if (
          confirm(
            `Do you want to save credentials for ${currentUrl}?\nUsername: ${username}`
          )
        ) {
          const encryptedPassword = CryptoJS.AES.encrypt(
            password,
            "secret-key-123"
          ).toString()
          chrome.runtime.sendMessage({
            action: "saveCredentials",
            url: currentUrl,
            username: username,
            password: encryptedPassword,
          })
        }
      } else {
        console.log("Credentials already exist, skipping save prompt")
      }
    })
  }
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "autofillCredentials") {
    const forms = document.querySelectorAll("form")
    forms.forEach((form) => {
      const inputs = form.querySelectorAll("input")
      let usernameInput = null
      let passwordInput = null

      inputs.forEach((input) => {
        if (input.type === "text" || input.type === "email") {
          usernameInput = input
        }
        if (input.type === "password") {
          passwordInput = input
        }
      })

      if (usernameInput && passwordInput) {
        usernameInput.value = request.username
        passwordInput.value = CryptoJS.AES.decrypt(
          request.password,
          "secret-key-123"
        ).toString(CryptoJS.enc.Utf8)
        console.log("Autofilled credentials from context menu for", request.url)
        sendResponse({ status: "success" })
      } else {
        sendResponse({ status: "error", message: "No suitable form found" })
      }
    })
  }
  return true
})
