chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveCredentials") {
    chrome.storage.local.get(["credentials"], function (result) {
      let credentials = result.credentials || []
      credentials.push({
        url: request.url,
        username: request.username,
        password: request.password,
        timestamp: new Date().toISOString(),
      })

      chrome.storage.local.set({ credentials: credentials }, function () {
        console.log("Credentials saved")
        sendResponse({ status: "success" })
      })
    })
    return true
  }
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "autofillCredentials",
    title: "Autofill Credentials",
    contexts: ["all"],
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "autofillCredentials") {
    chrome.storage.local.get(["credentials"], function (result) {
      const credentials = result.credentials || []
      const currentUrl = new URL(tab.url).hostname
      const matchingCredentials = credentials.filter(
        (cred) => cred.url === currentUrl
      )

      if (matchingCredentials.length > 0) {
        const cred = matchingCredentials[0]
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "autofillCredentials",
            url: currentUrl,
            username: cred.username,
            password: cred.password,
          },
          function (response) {
            if (response && response.status === "success") {
              console.log("Autofill triggered successfully")
            } else {
              console.error(
                "Autofill failed:",
                response ? response.message : "No response"
              )
            }
          }
        )
      } else {
        console.log("No credentials found for", currentUrl)
      }
    })
  }
})
