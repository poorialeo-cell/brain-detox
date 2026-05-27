# Privacy Policy

**Last Updated: May 24, 2026**

brain-detox (the "App") respects your privacy and collects only the minimum information needed to operate. This policy describes what data the App handles, how it is used, where it is stored, and what rights you have.

---

## 1. Data We Collect

### 1-1. Anonymous Identifier

The App uses **Firebase Authentication's anonymous sign-in** to issue a unique anonymous ID (UID) for each user. This ID is **not linked to your name, email, phone number, or any other personal information**.

### 1-2. In-App Data

The following data is stored on our servers (Google Cloud Firestore, Tokyo region `asia-northeast1`):


| Data                  | Description                                                         | Purpose                                      |
| --------------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| Partner selection     | Selected partner type (teacher / counselor / scientist / trainer)   | Personalize action suggestions               |
| Brain score           | Numeric value 0 E00                                                 | Core app feature (brain condition indicator) |
| Language preference   | `ja` / `en` / `th`                                                  | UI localization                              |
| Score history         | Records of completed actions and brain-rot tests (up to 60 entries) | History display, streak calculation          |
| Notification settings | Enabled/disabled, reminder times                                    | **Device-only**, not synced to cloud         |
| Badge progress        | **Device-only**, not synced to cloud                                | Achievements display                         |
| Rate limit counter    | Daily API call count                                                | Service protection, cost management          |


### 1-3. Device Permissions


| Permission           | Use                                  | Required / Optional                 |
| -------------------- | ------------------------------------ | ----------------------------------- |
| Notifications (push) | Daily reminders, timer-finish alerts | **Optional** (App works without it) |


The App does **not** access location, contacts, camera, microphone, photo library, health data, or advertising identifiers (IDFA / AAID).

---

## 2. Third-Party Services

### 2-1. Firebase (Google LLC)

The App uses Firebase services:

- **Firebase Authentication**: Anonymous UID issuance
- **Cloud Firestore**: Storage for the data above (Tokyo region)
- **Cloud Functions for Firebase**: Proxy for the OpenAI API (Tokyo region)
- **Firebase App Check**: Protection against unauthorized clients

Firebase Privacy & Security: [https://firebase.google.com/support/privacy](https://firebase.google.com/support/privacy)

### 2-2. OpenAI (OpenAI, L.L.C.)

To generate action suggestions and partner messages, the following is sent to the **OpenAI API (US servers)**:


| Sent                                            | NOT Sent                     |
| ----------------------------------------------- | ---------------------------- |
| Current brain score (0 E00)                     | Anonymous UID                |
| Selected partner type                           | Device information           |
| Language preference                             | Personally identifiable info |
| Recent action summary (max 3 titles, truncated) | Detailed score history       |


Per OpenAI's policy, **data sent via the API is not used to train OpenAI models**.

OpenAI API data usage: [https://platform.openai.com/docs/models/how-we-use-your-data](https://platform.openai.com/docs/models/how-we-use-your-data)

### 2-3. Expo (Expo, Inc.)

The App is built with Expo, but **no user data is sent to Expo's servers**. Push notification tokens may pass through Expo's push service; the token itself is kept on your device.

---

## 3. Data Retention and Deletion

### 3-1. Retention

Even after you uninstall the App, data stored in Firestore is retained so that re-installation can restore the same anonymous UID.

### 3-2. Deletion

You can delete your data in two ways:

1. **In-App: Settings ↁEReset Data**
  - Removes profile and score history stored in Firestore
  - Erases all local settings on your device
2. **By Request** (special cases)
  - Email the contact below
  - Including your anonymous UID (visible in Settings) speeds up the process

---

## 4. Disclosure to Third Parties

We do not disclose or sell user data to any third party, except as required by law.

---

## 5. Children's Privacy

The App is **not intended for users under 13**. If a parent or guardian discovers that a child under 13 is using the App, please delete the data using the methods above.

---

## 6. Your Rights

Under the EU General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), and other applicable laws, you have the following rights:

- Right to access your stored data
- Right to rectification
- Right to erasure ("right to be forgotten")
- Right to object to processing
- Right to data portability

To exercise these rights, please contact us at the address below.

---

## 7. Security

- All communication is encrypted via **HTTPS / TLS**
- Firestore Rules ensure each user can only access their own data
- The OpenAI API key is held in Firebase Functions Secret Manager and never exposed to clients
- Firebase App Check ensures requests originate from a legitimate app build

That said, no internet transmission is absolutely secure.

---

## 8. Cookies and Tracking

The App is a mobile application and **uses no cookies**. It uses no advertising or tracking identifiers.

---

## 9. Changes to This Policy

This policy may be updated without prior notice. Material changes will be announced via in-app notification or app update notes. The latest version is always available on this page.

---

## 10. Contact

For questions or data deletion requests:

- **Contact email**: `l.ikeda.937@gmail.com`
- **App name**: brain-detox
- **Operator**: `池田怜雄`

---

*This policy is provided in Japanese, English, and Thai. In case of any discrepancy, the Japanese version prevails.*