let timerInterval = null

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `Session expires in ${minutes}:${secs.toString().padStart(2, "0")}`
}

function startTimer(authTimestamp) {
  const authTimeout = 90 * 1000 // 90 giây
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
        alert("Master password set successfully")
      }
    )
  } else {
    alert("Passwords do not match or are empty")
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
          document.getElementById("credentialsList").style.display = "block"
          document.getElementById("showAddFormButton").textContent =
            "Show Add Credential Form"
          displayCredentials()
          restoreTempCredential()
          startTimer(authTimestamp)
        })
      } else {
        alert("Incorrect master password")
      }
    } else {
      alert("Master password not set")
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
}

function addCredential() {
  const url = document.getElementById("newUrl").value.trim()
  const username = document.getElementById("newUsername").value.trim()
  const password = document.getElementById("newPassword").value.trim()

  if (!url || !username || !password) {
    alert("Please fill in all fields")
    return
  }

  let hostname
  try {
    hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname
  } catch (e) {
    alert("Invalid URL format")
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
      alert("These credentials already exist")
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
          alert("Credential added successfully")
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
            alert("Credentials exported successfully")
          } else {
            alert("Failed to export credentials")
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
      alert("Credentials exported successfully (fallback method)")
      URL.revokeObjectURL(url)
    }
  })
}

function importCredentials(event) {
  const file = event.target.files[0]
  if (!file) {
    alert("Please select a JSON file")
    return
  }
  if (!file.name.endsWith(".json")) {
    alert("Please select a valid JSON file")
    return
  }

  const reader = new FileReader()
  reader.onload = function (e) {
    try {
      const importedData = JSON.parse(e.target.result)
      if (!Array.isArray(importedData)) {
        alert("Invalid JSON format: Expected an array of credentials")
        return
      }

      const validCredentials = importedData.filter(
        (cred) => cred.url && cred.username && cred.password && cred.timestamp
      )
      if (validCredentials.length === 0) {
        alert("No valid credentials found in the file")
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
            alert(
              `Imported ${newCredentials.length} new credentials successfully`
            )
            displayCredentials()
            document.getElementById("importFileInput").value = ""
          }
        )
      })
    } catch (e) {
      alert("Error parsing JSON file: " + e.message)
    }
  }
  reader.readAsText(file)
}

function displayCredentials() {
  chrome.storage.local.get(["credentials"], function (result) {
    const list = document.getElementById("credentials")
    list.innerHTML = ""

    if (result.credentials && result.credentials.length > 0) {
      result.credentials.forEach((cred, index) => {
        const decryptedPassword = CryptoJS.AES.decrypt(
          cred.password,
          "secret-key-123"
        ).toString(CryptoJS.enc.Utf8)
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${cred.url}`
        const div = document.createElement("div")
        div.className = "credential"
        div.innerHTML = `
                    <img src="${faviconUrl}" class="favicon" onerror="this.style.display='none'">
                    <strong>${cred.url}</strong><br>
                    Username: ${cred.username}<br>
                    Password: <span class="password" data-password="${decryptedPassword}" id="password-${index}">••••••••</span>
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
          if (this.textContent === "Show") {
            passwordSpan.textContent = originalPassword
            this.textContent = "Hide"
          } else {
            passwordSpan.textContent = "••••••••"
            this.textContent = "Show"
          }
        })
      })
    } else {
      list.innerHTML = "No credentials saved"
    }
  })
}

function clearCredentials() {
  if (confirm("Are you sure you want to clear all saved credentials?")) {
    chrome.storage.local.set({ credentials: [] }, function () {
      displayCredentials()
    })
  }
}

function logout() {
  clearInterval(timerInterval)
  document.getElementById("timer").textContent = "Session expired"
  document.getElementById("credentialsList").style.display = "none"
  document.getElementById("addCredentialSection").classList.add("hidden")
  document.getElementById("authSection").classList.remove("hidden")
  chrome.storage.local.set({ authTimestamp: null })
}

document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.local.get(
    ["masterPassword", "authTimestamp"],
    function (result) {
      const now = Date.now()
      const authTimeout = 90 * 1000 // 90 giây

      if (!result.masterPassword) {
        document.getElementById("setPasswordSection").classList.remove("hidden")
        document.getElementById("authSection").classList.add("hidden")
        document.getElementById("addCredentialSection").classList.add("hidden")
        document.getElementById("credentialsList").style.display = "none"
      } else if (
        result.authTimestamp &&
        now - result.authTimestamp < authTimeout
      ) {
        document.getElementById("setPasswordSection").classList.add("hidden")
        document.getElementById("authSection").classList.add("hidden")
        document.getElementById("addCredentialSection").classList.add("hidden")
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
    .getElementById("newUrl")
    .addEventListener("input", saveTempCredential)
  document
    .getElementById("newUsername")
    .addEventListener("input", saveTempCredential)
  document
    .getElementById("newPassword")
    .addEventListener("input", saveTempCredential)
})
