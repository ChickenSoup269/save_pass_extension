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
            .classList.remove("hidden")
          document.getElementById("credentialsList").style.display = "block"
          displayCredentials()
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

function addCredential() {
  const url = document.getElementById("newUrl").value.trim()
  const username = document.getElementById("newUsername").value.trim()
  const password = document.getElementById("newPassword").value.trim()

  if (!url || !username || !password) {
    alert("Please fill in all fields")
    return
  }

  // Chuẩn hóa URL thành hostname
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
          alert("Credential added successfully")
          displayCredentials()
        }
      }
    )
  })
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
        const div = document.createElement("div")
        div.className = "credential"
        div.innerHTML = `
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
        document
          .getElementById("addCredentialSection")
          .classList.remove("hidden")
        document.getElementById("credentialsList").style.display = "block"
        displayCredentials()
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
})
