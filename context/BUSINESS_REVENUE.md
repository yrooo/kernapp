This revised model makes **Kern** a much leaner, more "founder-focused" platform. By removing the jury and staking, you’ve turned it into a high-speed, automated SaaS for the creator economy.

Here is the finalized business and revenue flow based on your requirements.

---

## 1. The Core Revenue Model (The "Service Fee" Model)

Since we aren't using yield, we focus on **Transactional Fees**. These fees cover your operational costs (AI processing, hosting) and provide your profit margin.

### A. The Setup Fee (Commitment Fee)

* **Rate:** **1.5% — 2%** of the initial deposit.
* **Paid By:** The Creator.
* **Trigger:** When the campaign is launched and SOL/USDC is moved into the Vault.
* **Logic:** This "Gas & AI" fee covers the cost of your agent downloading the long-form source material and indexing the creator's face/voice into your vector database.

### B. The Performance Fee (Success Fee)

* **Rate:** **3% — 5%** of the payout.
* **Paid By:** The Clipper.
* **Trigger:** When a clip is verified and funds are released to the clipper.
* **Logic:** This is your core platform fee for providing the trustless infrastructure that guarantees their payment.

### C. The Early Exit Fee (Refund Penalty)

* **Rate:** **5% — 7%** of the *remaining* vault balance.
* **Paid By:** The Creator.
* **Trigger:** When the creator terminates a campaign before the "Expiry Date."
* **Logic:** This prevents creators from "gaming" clippers by pulling funds the moment a video starts to go viral. It ensures that if they leave early, the platform is compensated for the lost "Success Fees" you would have earned.

---

## 2. The Revised Review Flow (AI + Creator)

Without a jury, you need a technical "Safety Switch" to ensure clippers are treated fairly.

### Stage 1: The AI "Confidence" Gate

When a clip is submitted, the AI (Gemini/Python Agent) assigns a **Confidence Score (0-100%)**.

* **High Confidence (>90%):** The clip perfectly matches the face, audio, and rules. It is **Auto-Approved**. The Creator cannot block this payment.
* **Medium Confidence (60%-89%):** There is a slight mismatch (e.g., heavy filters or loud background music). This is sent to the **Creator Dashboard** for manual review.
* **Low Confidence (<60%):** Immediate **Auto-Reject**.

### Stage 2: The Creator's Review

For "Medium Confidence" clips, the creator has two choices:

* **Approve:** Payment is released immediately.
* **Reject:** The creator must select a reason from a pre-defined list (e.g., "Violates soft-style guidelines").
* **The Ghosting Protection:** If the creator doesn't act on a "Medium Confidence" clip within **48 hours**, the system assumes the creator is inactive and the AI **auto-approves** the payment to protect the clipper.

---

## 3. The Refund & Removal Logic (The "Grace Period")

Since there is a cost to refunding, you need a clear UI/UX for it. You shouldn't just let them "Delete" the campaign instantly.

1. **Initiate Refund:** Creator clicks "End Campaign."
2. **The Cooling-Off Period:** A **48-hour or 72-hour countdown** begins.
* *Why?* To allow clippers who have already edited videos to submit their work and get paid before the vault closes.


3. **Final Payouts:** Any clips currently in the "Tracking" or "Review" phase are settled.
4. **The Release:** After the countdown, the remaining SOL is sent back to the creator, **minus the 5-7% Exit Fee.**

---

## 4. Financial Summary Table

| Event | Fee | Target | Purpose |
| --- | --- | --- | --- |
| **Deposit** | 2% | Creator | AI Indexing & Platform Setup |
| **Payout** | 3% | Clipper | Success Fee / Platform Usage |
| **Refund** | 5% | Creator | Early Termination Penalty |

---

## 5. Technical Implications for your ERD

To support this in Supabase, you’ll need to add these fields to your `CAMPAIGNS` table:

* **`refund_requested_at`**: (Timestamp) To manage the cooling-off countdown.
* **`is_active`**: (Boolean) To hide campaigns that are in the refund process.
* **`termination_fee_rate`**: (Decimal) To store the specific penalty agreed upon at launch.

This model is much cleaner for a hackathon. It proves that you have a viable business (revenue from every action) and that you’ve thought about **User Protection** (the refund penalty and the 48-hour auto-approval).