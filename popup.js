let timerInterval = null

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `Session expires in ${minutes}:${secs.toString().padStart(2, "0")}`
}

function showNotification(message, type = "info") {
  const notification = document.getElementById("notification")
  notification.textContent = message
  notification.className = type // success, error, or info
  notification.classList.add("visible")
  setTimeout(() => {
    notification.classList.remove("visible")
    setTimeout(() => {
      notification.textContent = ""
      notification.className = ""
    }, 300) // Wait for fade-out transition
  }, 3000) // Display for 3 seconds
}

function startTimer(authTimestamp) {
  chrome.storage.local.get(["sessionTimeout"], function (result) {
    const authTimeout = (result.sessionTimeout || 90) * 1000 // Mặc định 90 giây
    const timerElement = document.getElementById("timer")

    function updateTimer() {
      const now = Date.now()
      const timeLeft = Math.max(
        0,
        Math.floor((authTimestamp + authTimeout - now) / 1000)
      )

      if (timeLeft <= 0) {
        clearInterval(timerInterval)
        timerElement.textContent = "Session expired"
        document.getElementById("credentialsList").style.display = "none"
        document.getElementById("addCredentialSection").classList.add("hidden")
        document.getElementById("settingsSection").classList.add("hidden")
        document.getElementById("authSection").classList.remove("hidden")
        chrome.storage.local.set({ authTimestamp: null })
      } else {
        timerElement.textContent = formatTime(timeLeft)
        if (timeLeft <= 10) {
          timerElement.classList.add("warning")
        } else {
          timerElement.classList.remove("warning")
        }
      }
    }

    updateTimer()
    timerInterval = setInterval(updateTimer, 1000)
  })
}

function setMasterPassword() {
  const newPassword = document.getElementById("newMasterPassword").value
  const confirmPassword = document.getElementById("confirmMasterPassword").value

  if (newPassword && newPassword === confirmPassword) {
    const encryptedMasterPassword = CryptoJS.AES.encrypt(
      newPassword,
      "master-key-123"
    ).toString()
    chrome.storage.local.set(
      {
        masterPassword: encryptedMasterPassword,
        authTimestamp: null,
        tempCredential: null,
      },
      function () {
        document.getElementById("setPasswordSection").classList.add("hidden")
        document.getElementById("authSection").classList.remove("hidden")
        document.getElementById("newMasterPassword").value = ""
        document.getElementById("confirmMasterPassword").value = ""
        showNotification("Master password set successfully", "success")
      }
    )
  } else {
    showNotification("Passwords do not match or are empty", "error")
  }
}

function authenticate() {
  const inputPassword = document.getElementById("masterPassword").value
  chrome.storage.local.get(["masterPassword"], function (result) {
    if (result.masterPassword) {
      const decryptedMasterPassword = CryptoJS.AES.decrypt(
        result.masterPassword,
        "master-key-123"
      ).toString(CryptoJS.enc.Utf8)
      if (inputPassword === decryptedMasterPassword) {
        const authTimestamp = Date.now()
        chrome.storage.local.set({ authTimestamp: authTimestamp }, function () {
          document.getElementById("authSection").classList.add("hidden")
          document
            .getElementById("addCredentialSection")
            .classList.add("hidden")
          document.getElementById("settingsSection").classList.add("hidden")
          document.getElementById("credentialsList").style.display = "block"
          document.getElementById("showAddFormButton").textContent =
            "Show Add Credential Form"
          displayCredentials()
          restoreTempCredential()
          startTimer(authTimestamp)
        })
      } else {
        showNotification("Incorrect master password", "error")
      }
    } else {
      showNotification("Master password not set", "error")
    }
  })
}

function saveTempCredential() {
  const url = document.getElementById("newUrl").value.trim()
  const username = document.getElementById("newUsername").value.trim()
  const password = document.getElementById("newPassword").value.trim()
  chrome.storage.local.set({
    tempCredential: { url, username, password },
  })
}

function restoreTempCredential() {
  chrome.storage.local.get(["tempCredential"], function (result) {
    if (result.tempCredential) {
      document.getElementById("newUrl").value = result.tempCredential.url || ""
      document.getElementById("newUsername").value =
        result.tempCredential.username || ""
      document.getElementById("newPassword").value =
        result.tempCredential.password || ""
    }
  })
}

function clearForm() {
  document.getElementById("newUrl").value = ""
  document.getElementById("newUsername").value = ""
  document.getElementById("newPassword").value = ""
  chrome.storage.local.set({ tempCredential: null })
  showNotification("Form cleared", "info")
}

function addCredential() {
  const url = document.getElementById("newUrl").value.trim()
  const username = document.getElementById("newUsername").value.trim()
  const password = document.getElementById("newPassword").value.trim()

  if (!url || !username || !password) {
    showNotification("Please fill in all fields", "error")
    return
  }

  let hostname
  try {
    hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname
  } catch (e) {
    showNotification("Invalid URL format", "error")
    return
  }

  chrome.storage.local.get(["credentials"], function (result) {
    const credentials = result.credentials || []
    const isDuplicate = credentials.some(
      (cred) =>
        cred.url === hostname &&
        cred.username === username &&
        CryptoJS.AES.decrypt(cred.password, "secret-key-123").toString(
          CryptoJS.enc.Utf8
        ) === password
    )

    if (isDuplicate) {
      showNotification("These credentials already exist", "error")
      return
    }

    const encryptedPassword = CryptoJS.AES.encrypt(
      password,
      "secret-key-123"
    ).toString()
    chrome.runtime.sendMessage(
      {
        action: "saveCredentials",
        url: hostname,
        username: username,
        password: encryptedPassword,
      },
      function (response) {
        if (response && response.status === "success") {
          document.getElementById("newUrl").value = ""
          document.getElementById("newUsername").value = ""
          document.getElementById("newPassword").value = ""
          document
            .getElementById("addCredentialSection")
            .classList.add("hidden")
          document.getElementById("showAddFormButton").textContent =
            "Show Add Credential Form"
          chrome.storage.local.set({ tempCredential: null })
          showNotification("Credential added successfully", "success")
          displayCredentials()
        }
      }
    )
  })
}

function toggleAddForm() {
  const addSection = document.getElementById("addCredentialSection")
  const button = document.getElementById("showAddFormButton")
  if (addSection.classList.contains("hidden")) {
    addSection.classList.remove("hidden")
    button.textContent = "Hide Add Credential Form"
    restoreTempCredential()
  } else {
    addSection.classList.add("hidden")
    button.textContent = "Show Add Credential Form"
    saveTempCredential()
  }
}

function showSettings() {
  const settingsSection = document.getElementById("settingsSection")
  const credentialsList = document.getElementById("credentialsList")
  const customMaskInput = document.getElementById("customMaskInput")
  if (settingsSection.style.display === "none") {
    settingsSection.style.display = "block"
    credentialsList.style.display = "none"
    chrome.storage.local.get(
      ["sessionTimeout", "passwordMaskStyle", "customMaskChar"],
      function (result) {
        document.getElementById("sessionTimeoutInput").value =
          result.sessionTimeout || 90
        document.getElementById("passwordMaskStyle").value =
          result.passwordMaskStyle || "dots"
        customMaskInput.value = result.customMaskChar || "●"
        customMaskInput.style.display =
          result.passwordMaskStyle === "custom" ? "block" : "none"
      }
    )
  } else {
    settingsSection.style.display = "none"
    credentialsList.style.display = "block"
  }
}

function saveSettings() {
  const sessionTimeout = parseInt(
    document.getElementById("sessionTimeoutInput").value
  )
  const passwordMaskStyle = document.getElementById("passwordMaskStyle").value
  const customMaskChar = document.getElementById("customMaskInput").value

  if (isNaN(sessionTimeout) || sessionTimeout < 30 || sessionTimeout > 3600) {
    showNotification(
      "Please enter a valid timeout between 30 and 3600 seconds",
      "error"
    )
    return
  }

  if (
    passwordMaskStyle === "custom" &&
    (!customMaskChar || customMaskChar.length !== 1)
  ) {
    showNotification("Please enter a single character for custom mask", "error")
    return
  }

  chrome.storage.local.set(
    {
      sessionTimeout: sessionTimeout,
      passwordMaskStyle: passwordMaskStyle,
      customMaskChar: passwordMaskStyle === "custom" ? customMaskChar : null,
    },
    function () {
      showNotification("Settings saved successfully", "success")
      document.getElementById("settingsSection").style.display = "none"
      document.getElementById("credentialsList").style.display = "block"
      displayCredentials()
      // Restart timer with new timeout
      chrome.storage.local.get(["authTimestamp"], function (result) {
        if (result.authTimestamp) {
          clearInterval(timerInterval)
          startTimer(result.authTimestamp)
        }
      })
    }
  )
}

function toggleMasterPassword() {
  const input = document.getElementById("masterPassword")
  const toggle = document.getElementById("toggleMasterPassword")
  if (input.type === "password") {
    input.type = "text"
    toggle.textContent = "Hide"
  } else {
    input.type = "password"
    toggle.textContent = "Show"
  }
}

function exportCredentials() {
  chrome.storage.local.get(["credentials"], function (result) {
    const credentials = result.credentials || []
    const exportData = credentials.map((cred) => ({
      url: cred.url,
      username: cred.username,
      password: CryptoJS.AES.decrypt(cred.password, "secret-key-123").toString(
        CryptoJS.enc.Utf8
      ),
      timestamp: cred.timestamp,
    }))
    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    if (chrome.downloads && typeof chrome.downloads.download === "function") {
      chrome.downloads.download(
        {
          url: url,
          filename: `password_manager_backup_${
            new Date().toISOString().split("T")[0]
          }.json`,
          saveAs: true,
        },
        function (downloadId) {
          if (downloadId) {
            showNotification("Credentials exported successfully", "success")
          } else {
            showNotification("Failed to export credentials", "error")
          }
          URL.revokeObjectURL(url)
        }
      )
    } else {
      const a = document.createElement("a")
      a.href = url
      a.download = `password_manager_backup_${
        new Date().toISOString().split("T")[0]
      }.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      showNotification(
        "Credentials exported successfully (fallback method)",
        "success"
      )
      URL.revokeObjectURL(url)
    }
  })
}

function importCredentials(event) {
  const file = event.target.files[0]
  if (!file) {
    showNotification("Please select a JSON file", "error")
    return
  }
  if (!file.name.endsWith(".json")) {
    showNotification("Please select a valid JSON file", "error")
    return
  }

  const reader = new FileReader()
  reader.onload = function (e) {
    try {
      const importedData = JSON.parse(e.target.result)
      if (!Array.isArray(importedData)) {
        showNotification(
          "Invalid JSON format: Expected an array of credentials",
          "error"
        )
        return
      }

      const validCredentials = importedData.filter(
        (cred) => cred.url && cred.username && cred.password && cred.timestamp
      )
      if (validCredentials.length === 0) {
        showNotification("No valid credentials found in the file", "error")
        return
      }

      chrome.storage.local.get(["credentials"], function (result) {
        const existingCredentials = result.credentials || []
        const newCredentials = validCredentials
          .map((cred) => {
            let hostname
            try {
              hostname = new URL(
                cred.url.startsWith("http") ? cred.url : `https://${cred.url}`
              ).hostname
            } catch (e) {
              console.error("Invalid URL in imported data:", cred.url)
              return null
            }
            return {
              url: hostname,
              username: cred.username,
              password: CryptoJS.AES.encrypt(
                cred.password,
                "secret-key-123"
              ).toString(),
              timestamp: cred.timestamp,
            }
          })
          .filter((cred) => cred !== null)

        const mergedCredentials = [...existingCredentials]
        newCredentials.forEach((newCred) => {
          const isDuplicate = existingCredentials.some(
            (existing) =>
              existing.url === newCred.url &&
              existing.username === newCred.username &&
              CryptoJS.AES.decrypt(
                existing.password,
                "secret-key-123"
              ).toString(CryptoJS.enc.Utf8) ===
                CryptoJS.AES.decrypt(
                  newCred.password,
                  "secret-key-123"
                ).toString(CryptoJS.enc.Utf8)
          )
          if (!isDuplicate) {
            mergedCredentials.push(newCred)
          }
        })

        chrome.storage.local.set(
          { credentials: mergedCredentials },
          function () {
            showNotification(
              `Imported ${newCredentials.length} new credentials successfully`,
              "success"
            )
            displayCredentials()
            document.getElementById("importFileInput").value = ""
          }
        )
      })
    } catch (e) {
      showNotification("Error parsing JSON file: " + e.message, "error")
    }
  }
  reader.readAsText(file)
}

function displayCredentials() {
  chrome.storage.local.get(
    ["credentials", "passwordMaskStyle", "customMaskChar"],
    function (result) {
      const list = document.getElementById("credentials")
      list.innerHTML = ""
      let mask
      if (result.passwordMaskStyle === "custom" && result.customMaskChar) {
        mask = result.customMaskChar.repeat(8)
      } else {
        mask =
          result.passwordMaskStyle === "asterisks" ? "**********" : "••••••••••"
      }

      if (result.credentials && result.credentials.length > 0) {
        result.credentials.forEach((cred, index) => {
          const decryptedPassword = CryptoJS.AES.decrypt(
            cred.password,
            "secret-key-123"
          ).toString(CryptoJS.enc.Utf8)
          const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${cred.url}`
          const div = document.createElement("div")
          div.className = "credential"
          div.innerHTML = `
                    <img src="${faviconUrl}" class="favicon" onerror="this.style.display='none'">
                    <strong>${cred.url}</strong><br>
                    Username: ${cred.username}<br>
                    Password: <span class="password" data-password="${decryptedPassword}" id="password-${index}">${mask}</span>
                    <button class="toggle-password" data-index="${index}">Show</button><br>
                    Saved: ${new Date(cred.timestamp).toLocaleString()}
                `
          list.appendChild(div)
        })

        document.querySelectorAll(".toggle-password").forEach((button) => {
          button.addEventListener("click", function () {
            const index = this.getAttribute("data-index")
            const passwordSpan = document.getElementById(`password-${index}`)
            const originalPassword = passwordSpan.getAttribute("data-password")
            chrome.storage.local.get(
              ["passwordMaskStyle", "customMaskChar"],
              function (result) {
                let mask
                if (
                  result.passwordMaskStyle === "custom" &&
                  result.customMaskChar
                ) {
                  mask = result.customMaskChar.repeat(8)
                } else {
                  mask =
                    result.passwordMaskStyle === "asterisks"
                      ? "**********"
                      : "••••••••••"
                }
                if (this.textContent === "Show") {
                  passwordSpan.textContent = originalPassword
                  this.textContent = "Hide"
                } else {
                  passwordSpan.textContent = mask
                  this.textContent = "Show"
                }
              }
            )
          })
        })
      } else {
        list.innerHTML = "No credentials saved"
      }
    }
  )
}

function clearCredentials() {
  if (confirm("Are you sure you want to clear all saved credentials?")) {
    chrome.storage.local.set({ credentials: [] }, function () {
      showNotification("All credentials cleared", "info")
      displayCredentials()
    })
  }
}

function logout() {
  clearInterval(timerInterval)
  document.getElementById("timer").textContent = "Session expired"
  document.getElementById("credentialsList").style.display = "none"
  document.getElementById("addCredentialSection").classList.add("hidden")
  document.getElementById("settingsSection").classList.add("hidden")
  document.getElementById("authSection").classList.remove("hidden")
  chrome.storage.local.set({ authTimestamp: null })
  showNotification("Logged out", "info")
}

document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.local.get(
    [
      "masterPassword",
      "authTimestamp",
      "sessionTimeout",
      "passwordMaskStyle",
      "customMaskChar",
    ],
    function (result) {
      const now = Date.now()
      const authTimeout = (result.sessionTimeout || 90) * 1000 // Mặc định 90 giây

      if (!result.masterPassword) {
        document.getElementById("setPasswordSection").classList.remove("hidden")
        document.getElementById("authSection").classList.add("hidden")
        document.getElementById("addCredentialSection").classList.add("hidden")
        document.getElementById("settingsSection").classList.add("hidden")
        document.getElementById("credentialsList").style.display = "none"
      } else if (
        result.authTimestamp &&
        now - result.authTimestamp < authTimeout
      ) {
        document.getElementById("setPasswordSection").classList.add("hidden")
        document.getElementById("authSection").classList.add("hidden")
        document.getElementById("addCredentialSection").classList.add("hidden")
        document.getElementById("settingsSection").classList.add("hidden")
        document.getElementById("credentialsList").style.display = "block"
        document.getElementById("showAddFormButton").textContent =
          "Show Add Credential Form"
        displayCredentials()
        restoreTempCredential()
        startTimer(result.authTimestamp)
      } else {
        document.getElementById("setPasswordSection").classList.add("hidden")
        document.getElementById("authSection").classList.remove("hidden")
        document.getElementById("addCredentialSection").classList.add("hidden")
        document.getElementById("settingsSection").classList.add("hidden")
        document.getElementById("credentialsList").style.display = "none"
        chrome.storage.local.set({ authTimestamp: null })
      }
    }
  )

  document
    .getElementById("setPasswordButton")
    .addEventListener("click", setMasterPassword)
  document.getElementById("authButton").addEventListener("click", authenticate)
  document
    .getElementById("clearCredentialsButton")
    .addEventListener("click", clearCredentials)
  document
    .getElementById("addCredentialButton")
    .addEventListener("click", addCredential)
  document
    .getElementById("showAddFormButton")
    .addEventListener("click", toggleAddForm)
  document
    .getElementById("clearFormButton")
    .addEventListener("click", clearForm)
  document
    .getElementById("toggleMasterPassword")
    .addEventListener("click", toggleMasterPassword)
  document
    .getElementById("exportButton")
    .addEventListener("click", exportCredentials)
  document
    .getElementById("importButton")
    .addEventListener("click", function () {
      document.getElementById("importFileInput").click()
    })
  document
    .getElementById("importFileInput")
    .addEventListener("change", importCredentials)
  document.getElementById("logoutButton").addEventListener("click", logout)
  document
    .getElementById("showSettingsButton")
    .addEventListener("click", showSettings)
  document
    .getElementById("saveSettingsButton")
    .addEventListener("click", saveSettings)

  document
    .getElementById("newUrl")
    .addEventListener("input", saveTempCredential)
  document
    .getElementById("newUsername")
    .addEventListener("input", saveTempCredential)
  document
    .getElementById("newPassword")
    .addEventListener("input", saveTempCredential)

  // Show/hide custom mask input based on selection
  document
    .getElementById("passwordMaskStyle")
    .addEventListener("change", function () {
      document.getElementById("customMaskInput").style.display =
        this.value === "custom" ? "block" : "none"
    })
})
