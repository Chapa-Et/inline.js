class ChapaCheckout {
    constructor(options) {
      this.options = {
        publicKey: options.publicKey || "YOUR_PUBLIC_KEY_HERE",
        customizations: options.customizations || {},
        callbackUrl: options.callbackUrl,
        returnUrl: options.returnUrl,
        availablePaymentMethods: options.availablePaymentMethods || [
          "telebirr",
          "cbebirr",
          "ebirr",
          "mpesa",
        ],
        assetPath: options.assetPath || "https://assets.chapa.co/inline-assets",
        amount: options.amount,
        currency: options.currency || "ETB",
        mobile: options.mobile || "",
        tx_ref: options.tx_ref || "",
        showFlag: options.showFlag !== false, 
        showPaymentMethodsNames: options.showPaymentMethodsNames !== false,
        onSuccessfulPayment: options.onSuccessfulPayment || null,
        onPaymentFailure: options.onPaymentFailure || null,
        onClose: options.onClose || null,
      };
  
      this.paymentType = "";
      this.hostedUrl = "https://api.chapa.co/v1/hosted/pay";
      this.chapaUrl = "https://inline.chapaservices.net/v1/inline/charge";
      this.verifyUrl = "https://inline.chapaservices.net/v1/inline/validate";
  
      this.paymentMethodIcons = {
        telebirr: {
          name: "telebirr",
          icon: `${this.options.assetPath}/telebirr.svg`,
          validPrefix: "9",
        },
        cbebirr: {
          name: "CBEBirr",
          icon: `${this.options.assetPath}/cbebirr.svg`,
          validPrefix: ["9", "7"],
        },
        ebirr: {
          name: "Ebirr",
          icon: `${this.options.assetPath}/ebirr.svg`,
          validPrefix: ["9", "7"],
        },
        mpesa: {
          name: "Mpesa",
          icon: `${this.options.assetPath}/mpesa.svg`,
          validPrefix: "7",
        },
        chapa: {
          name: "Others via Chapa",
          icon: `${this.options.assetPath}/chapa.svg`,
        },
      };
  
      this.elements = {};
    }
  
    initialize(containerId = "chapa-inline-form") {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Container with ID ${containerId} not found.`);
        return;
      }
  
      container.innerHTML = `
              <div id="chapa-error-container" class="chapa-error"></div>
              <div id="chapa-phone-input-container"></div>
              <div id="chapa-payment-methods"></div>
              <button id="chapa-pay-button" type="submit"></button>
              <div id="chapa-loading-container" class="chapa-loading">
                  <div class="chapa-spinner"></div>
                  <p>Processing payment...</p>
              </div>
          `;
  
      this.renderPhoneInput();
      this.renderPaymentMethods();
      this.renderPayButton();
      this.applyCustomStyles();
    }
  
    renderPhoneInput() {
      const inputContainer = document.getElementById(
        "chapa-phone-input-container"
      );
      const showFlag = this.options.showFlag;
  
      inputContainer.innerHTML = `
              <div class="chapa-phone-input-wrapper">
                  ${
                    showFlag
                      ? `
                  <div class="chapa-phone-prefix">
                      <img src="${this.options.assetPath}/ethiopia-flag.svg" alt="Ethiopia Flag" class="chapa-flag-icon">
                      <span>+251</span>
                  </div>`
                      : `
                  <div class="chapa-phone-prefix">
                      <span>+251</span>
                  </div>`
                  }
                  <input type="tel" id="chapa-phone-number" name="mobile" value="${
                    this.options.mobile || ""
                  }" placeholder="9|7xxxxxxxx" required class="chapa-phone-input">
              </div>
          `;
    }
  
    handlePayment() {
      const phoneNumber =
        this.options.mobile ||
        document.getElementById("chapa-phone-number").value;
      if (
        !this.validatePhoneNumber(phoneNumber) ||
        !this.validatePaymentMethod()
      ) {
        return;
      }
  
      const paymentData = {
        amount: this.options.amount,
        currency: this.options.currency,
        tx_ref: this.options.tx_ref || this.generateTxRef(),
        mobile: phoneNumber,
      };
  
      this.open(paymentData);
    }
  
    renderPaymentMethods() {
      const container = document.getElementById("chapa-payment-methods");
      container.className = "chapa-payment-methods-grid";
      container.innerHTML = "";
  
      this.options.availablePaymentMethods.forEach((method) => {
        if (this.paymentMethodIcons[method]) {
          const methodElement = this.createPaymentMethodElement(method);
          container.appendChild(methodElement);
        }
      });
    }
  
    createPaymentMethodElement(method) {
      const paymentMethod = this.paymentMethodIcons[method];
      const element = document.createElement("div");
      element.className = "chapa-payment-method";
      element.innerHTML = `
              <img src="${paymentMethod.icon}" alt="${paymentMethod.name}" class="chapa-payment-icon">
              ${
                this.options.showPaymentMethodsNames
                  ? `<span class="chapa-payment-name">${paymentMethod.name}</span>`
                  : ""
              }
          `;
      element.addEventListener("click", () =>
        this.selectPaymentMethod(method, element)
      );
      return element;
    }
  
    selectPaymentMethod(method, element) {
      this.paymentType = method;
      document.querySelectorAll(".chapa-payment-method").forEach((el) => {
        el.classList.remove("chapa-selected");
      });
      element.classList.add("chapa-selected");
    }
  
    renderPayButton() {
      const button = document.getElementById("chapa-pay-button");
      button.textContent = this.options.customizations.buttonText || "Pay Now";
      button.className = "chapa-pay-button";
      button.addEventListener("click", () => this.handlePayment());
    }
  
    applyCustomStyles() {
      if (!document.getElementById("chapa-styles")) {
        const style = document.createElement("style");
        style.id = "chapa-styles";
        style.textContent = `
                  .chapa-error { display: none; color: red; margin-bottom: 10px; }
                  .chapa-loading { display: none; text-align: center; margin-top: 15px; }
                  .chapa-spinner { display: inline-block; width: 30px; height: 30px; border: 3px solid rgba(0,0,0,.1); border-radius: 50%; border-top-color: #7DC400; animation: chapa-spin 1s ease-in-out infinite; }
                  @keyframes chapa-spin { to { transform: rotate(360deg); } }
                  .chapa-payment-methods-grid { display: flex; justify-content: space-between; gap: 8px; margin: 15px 0; }
                  .chapa-payment-method { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; cursor: pointer; width: 60px; height: 60px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15); }
                  .chapa-payment-icon { width: 42px; height: 42px; margin-bottom: 4px; }
                  .chapa-payment-name { font-size: 11px; text-align: center; }
                  .chapa-selected { background-color: #e6fffa; box-shadow: 0 0 0 2px #10b981; }
                  .chapa-input-wrapper { margin-bottom: 10px; }
                  .chapa-input-wrapper label { display: block; margin-bottom: 5px; font-weight: 600; color: #333; }
                  .chapa-input { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px; outline: none; box-sizing: border-box; transition: border-color 0.3s, box-shadow 0.3s; }
                  .chapa-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2); }
                  .chapa-phone-input-wrapper { position: relative; margin-bottom: 20px; display: flex; align-items: center; }
                  .chapa-phone-prefix { display: flex; align-items: center; padding: 0 12px; background-color: #ffffff; border-radius: 7px 0 0 7px; height: 100%; font-size: 16px; color: #6b7280; }
                  .chapa-flag-icon { width: 24px; height: auto; margin-right: 8px; }
                  .chapa-phone-input { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px; outline: none; box-sizing: border-box; transition: border-color 0.3s, box-shadow 0.3s; }
                  .chapa-phone-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2); }
                  .chapa-pay-button { background-color: #7DC400; color: #FFFFFF; border: none; border-radius: 4px; padding: 10px; font-size: 16px; cursor: pointer; width: 100%; transition: background-color 0.3s; }
                  .chapa-pay-button:hover { background-color: #6baf00; }
              `;
        document.head.appendChild(style);
      }
  
      if (this.options.customizations.styles) {
        const customStyle = document.createElement("style");
        customStyle.textContent = this.options.customizations.styles;
        document.head.appendChild(customStyle);
      }
  
      this.adjustPhoneInputPadding();
      window.addEventListener("resize", () => this.adjustPhoneInputPadding());
    }
  
    adjustPhoneInputPadding() {
      const prefix = document.querySelector(".chapa-phone-prefix");
      const input = document.querySelector(".chapa-phone-input");
      if (prefix && input) {
        const prefixWidth = prefix.offsetWidth;
        input.style.paddingLeft = `${prefixWidth + 12}px`;
      }
    }
  
    validatePhoneNumber(phoneNumber) {
      if (phoneNumber.startsWith("0")) {
        phoneNumber = phoneNumber.substring(1);
      } else if (phoneNumber.startsWith("251")) {
        phoneNumber = phoneNumber.substring(3);
      } else if (phoneNumber.startsWith("+251")) {
        phoneNumber = phoneNumber.substring(4);
      }
  
      const firstDigit = phoneNumber.charAt(0);
      if (
        phoneNumber.length !== 9 ||
        (firstDigit !== "9" && firstDigit !== "7")
      ) {
        this.showError("Please enter a valid Ethiopian phone number.");
        return false;
      }
      if (this.paymentType === "telebirr" && firstDigit !== "9") {
        this.showError("Please enter a valid telebirr mobile number.");
        return false;
      }
      if (this.paymentType === "mpesa" && firstDigit !== "7") {
        this.showError("Please enter a valid M-Pesa mobile number.");
        return false;
      }
      return true;
    }
  
    validatePaymentMethod() {
      if (!this.paymentType) {
        this.showError("Please select a payment method.");
        return false;
      }
      return true;
    }
  
    showError(message) {
      const errorContainer = document.getElementById("chapa-error-container");
      errorContainer.textContent = message;
      errorContainer.style.display = "block";
    }
  
    hideError() {
      const errorContainer = document.getElementById("chapa-error-container");
      errorContainer.style.display = "none";
    }
  
    showLoading() {
      document.getElementById("chapa-loading-container").style.display = "block";
    }
  
    hideLoading() {
      document.getElementById("chapa-loading-container").style.display = "none";
    }
  
    async open(paymentData) {
      try {
        if (this.paymentType === "chapa") {
          this.submitChapaForm(paymentData);
          return;
        }
  
        const formData = new FormData();
        for (const [key, value] of Object.entries(paymentData)) {
          formData.append(key, value);
        }
  
        document.getElementById("chapa-pay-button").disabled = true;
        this.showLoading();
  
        const initiateResponse = await fetch(
          `${this.chapaUrl}?type=${this.paymentType}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.options.publicKey}`,
            },
            body: formData,
          }
        );
  
        const initiateResult = await initiateResponse.json();
  
        if (initiateResult.status !== "success") {
          this.showError(
            "Transaction initiation failed: " + initiateResult.message
          );
          document.getElementById("chapa-pay-button").disabled = false;
          this.hideLoading();
          if (this.options.onPaymentFailure) {
            this.options.onPaymentFailure(initiateResult.message);
          }
          return;
        }
  
        const refId = initiateResult.data.meta.ref_id;
        await this.verifyPayment(refId);
      } catch (error) {
        this.showError("Error during transaction: " + error.message);
        document.getElementById("chapa-pay-button").disabled = false;
        this.hideLoading();
        if (this.options.onPaymentFailure) {
          this.options.onPaymentFailure(error.message);
        }
      }
    }
  
    async verifyPayment(refId) {
      try {
        let isVerified = false;
  
        while (!isVerified) {
          const verifyFormData = new FormData();
          verifyFormData.append("reference", refId);
  
          const verifyResponse = await fetch(
            `${this.verifyUrl}?type=${this.paymentType}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${this.options.publicKey}`,
              },
              body: verifyFormData,
            }
          );
  
          const verifyResult = await verifyResponse.json();
  
          if (verifyResult.status === "success") {
            isVerified = true;
            this.hideLoading();
            this.handleSuccessfulPayment(verifyResult, refId);
          } else if (verifyResult.status !== "pending") {
            this.hideLoading();
            this.showError(
              "Payment verification failed: " + verifyResult.message
            );
            if (this.options.onPaymentFailure) {
              this.options.onPaymentFailure(verifyResult.message);
            }
            break;
          }
  
          await this.delay(3000);
        }
      } catch (error) {
        this.hideLoading();
        this.showError("Error during payment verification: " + error.message);
        if (this.options.onPaymentFailure) {
          this.options.onPaymentFailure(error.message);
        }
      }
    }
  
    handleSuccessfulPayment(verifyResult, refId) {
      const callback_url =
        verifyResult.data?.callback_url || this.options.callbackUrl;
      const return_url = verifyResult.data?.return_url || this.options.returnUrl;
  
      if (callback_url) {
        this.sendCallback(refId, callback_url);
      }
      if (return_url ) {

        window.location.href = return_url;

      } else {
        this.showPopup("Payment is successful!", () => {
         
          document.getElementById("chapa-pay-button").disabled = true;
        });
      }
  
      if (this.options.onSuccessfulPayment) {
        this.options.onSuccessfulPayment(verifyResult, refId);
      }
  

    }
  
    showPopup(message, callback = null) {
      const popupContainer = document.createElement("div");
      popupContainer.id = "popup-container";
      popupContainer.style.position = "fixed";
      popupContainer.style.top = "0";
      popupContainer.style.left = "0";
      popupContainer.style.width = "100%";
      popupContainer.style.height = "100%";
      popupContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      popupContainer.style.display = "flex";
      popupContainer.style.justifyContent = "center";
      popupContainer.style.alignItems = "center";
      popupContainer.style.zIndex = "1000";
  
      const popup = document.createElement("div");
      popup.style.backgroundColor = "#fff";
      popup.style.padding = "30px";
      popup.style.borderRadius = "15px";
      popup.style.textAlign = "center";
      popup.style.boxShadow = "0 0 20px rgba(0, 0, 0, 0.3)";
      popup.style.maxWidth = "90%";
      popup.style.width = "350px";
  
      const popupMessage = document.createElement("p");
      popupMessage.textContent = message;
      popupMessage.style.fontSize = "16px";
      popupMessage.style.marginBottom = "20px";
      popupMessage.style.color = "#0D1B34";
      popupMessage.style.fontWeight = "bold";
      popup.appendChild(popupMessage);
  
      const closeButton = document.createElement("button");
      closeButton.textContent = "Okay";
      closeButton.style.marginTop = "20px";
      closeButton.style.padding = "10px 20px";
      closeButton.style.backgroundColor = "#7DC400";
      closeButton.style.color = "#FFFFFF";
      closeButton.style.border = "none";
      closeButton.style.borderRadius = "5px";
      closeButton.style.cursor = "pointer";
      closeButton.style.fontSize = "16px";
  
      closeButton.addEventListener("click", () => {
        document.body.removeChild(popupContainer);
        if (callback) callback();
        if (this.options.onClose) {
          this.options.onClose();
        }
      });
  
      popup.appendChild(closeButton);
      popupContainer.appendChild(popup);
      document.body.appendChild(popupContainer);
  
      if (!callback) {
        setTimeout(() => {
          if (popupContainer.parentNode) {
            document.body.removeChild(popupContainer);
            if (this.options.onClose) {
              this.options.onClose();
            }
          }
        }, 5000); // Close after 5 seconds if no callback is provided
      }
    }
  
    sendCallback(refId, callbackUrl) {
      console.log("Sending callback:", refId, callbackUrl);
      const data = JSON.stringify({ tx_ref: refId, status: "success" });
      fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: data,
      }).catch((error) => console.error("Error sending callback:", error));
    }
  
    submitChapaForm(paymentData) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = this.hostedUrl;
  
      const fields = {
        public_key: this.options.publicKey,
        tx_ref: paymentData.tx_ref,
        amount: paymentData.amount,
        currency: paymentData.currency,
      };
  
      if (this.options.callbackUrl) {
        fields.callback_url = this.options.callbackUrl;
      }
  
      if (this.options.returnUrl) {
        fields.return_url = this.options.returnUrl;
      }
  
      for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }
  
      document.body.appendChild(form);
      form.submit();
    }
  
    generateTxRef() {
      return "tx_" + Math.random().toString(36).substr(2, 9);
    }
  
    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  }
  
  window.ChapaCheckout = ChapaCheckout;
  