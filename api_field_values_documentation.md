# Nami Personal Finance Assistant — API Field Values Documentation

This document describes all API endpoints in Nami (v3) and lists every possible value and data constraint that each request and response field can take.

---

## 1. Messages API

### 1.1 Ingest Message
* **Routes:** `POST /api/messages`, `POST /messages`
* **Content-Type:** `application/json` (or fallback to `text/plain` for raw message content)

#### Request JSON Body Fields
| Field | Type | Required | Allowed / Possible Values | Description |
| :--- | :--- | :--- | :--- | :--- |
| `message` | `string` | **Yes** | Any non-empty string | Raw SMS text (e.g. `"Spent Rs. 1500 on Shopping"`). |
| `category` | `string` | No | `"Food"`, `"Transport"`, `"Shopping"`, `"Health"`, `"Utilities"`, `"Entertainment"`, `"Other"`, `null`, or omitted | Ingestion category. If a category matches one of the allowed categories, it propagates to the transaction. Invalid categories default to `null` on processing. |
| `modeOfPayment` | `string` | No | `"UPI"`, `"Card"`, `null`, or omitted | Ingestion mode of payment. Invalid payment modes will be stored in raw logs, but only `"UPI"` and `"Card"` propagate to transactions. |

#### Response JSON Body Fields
| Field | Type | Possible Values | Description |
| :--- | :--- | :--- | :--- |
| `id` | `integer` | Any positive integer | Unique identifier of the ingested message. |
| `message` | `string` | Same as request `message` | Stored raw message text. |
| `received_at` | `string` | ISO-8601 string (e.g. `"2026-05-24T12:00:00Z"`) | Timestamp of ingestion. |
| `processed` | `boolean` | `true`, `false` | Whether transaction generation has run on this message. Starts as `false`. |
| `parse_failed` | `boolean` | `true`, `false` | Whether amount parsing failed. Starts as `false`. |
| `category` | `string` / `null` | Same as request `category` | Stored category value. |
| `mode_of_payment` | `string` / `null` | Same as request `modeOfPayment` | Stored payment mode (internally converted to snake_case `mode_of_payment`). |

---

### 1.2 Get Raw Messages (Log Book)
* **Routes:** `GET /api/raw_messages`, `GET /raw_messages`

#### Query Parameters
| Parameter | Type | Required | Default | Allowed / Possible Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | No | `"all"` | `"all"`, `"pending"`, `"processed"`, `"failed"` | Filters messages by parsing status. |
| `search` | `string` | No | `null` | Any search query string | Performs case-insensitive matching against message text. |

#### Response JSON Body (List of Objects)
Each object contains the same fields as the **Ingest Message** response body.

---

### 1.3 Reprocess Raw Message
* **Routes:** `POST /api/raw_messages/{id}/reprocess`, `POST /raw_messages/{id}/reprocess`
* **Path Parameters:**
  * `id` (`integer`, required): Unique message identifier.

#### Response JSON Body Fields
| Field | Type | Possible Values | Description |
| :--- | :--- | :--- | :--- |
| `status` | `string` | `"success"` | Operation result status. |
| `message` | `string` | `"Message reprocessed successfully"` | Descriptive confirmation text. |
| `raw_message` | `object` | `{ "id": integer, "processed": boolean, "parse_failed": boolean }` | Status updates of the reprocessed message. |
| `transaction_created_or_updated` | `boolean` | `true`, `false` | `true` if a transaction was successfully generated or modified. |

---

## 2. Transactions API

### 2.1 List Transactions
* **Routes:** `GET /api/transactions`, `GET /transactions`

#### Query Parameters
| Parameter | Type | Required | Allowed / Possible Values | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `string` | No | Date formatted as `YYYY-MM-DD` | Filter transactions that occurred on a specific date. |
| `from` | `string` | No | Date formatted as `YYYY-MM-DD` | Filter range starting date. |
| `to` | `string` | No | Date formatted as `YYYY-MM-DD` | Filter range ending date. |

#### Response JSON Body (List of Objects)
| Field | Type | Possible Values | Description |
| :--- | :--- | :--- | :--- |
| `id` | `integer` | Any positive integer | Unique identifier of the transaction record. |
| `raw_message_id` | `integer` | Any positive integer | ID of the source raw message. |
| `amount` | `number` | Positive decimal number | Parsed spend amount (in Indian Rupees). |
| `category` | `string` / `null` | `"Food"`, `"Transport"`, `"Shopping"`, `"Health"`, `"Utilities"`, `"Entertainment"`, `"Other"`, or `null` | Categorized spend bucket. |
| `mode_of_payment` | `string` / `null` | `"UPI"`, `"Card"`, or `null` | Used payment mode. |
| `description` | `string` | Any string | Custom description, falls back to raw SMS content. |
| `timestamp` | `string` | ISO-8601 string | Date and time the transaction occurred. |
| `created_at` | `string` | ISO-8601 string | Date and time the record was created. |
| `raw_message` | `object` / `null` | `{ "id": integer, "message": string, "received_at": string }` or `null` | Nested details of the corresponding source raw message. |

---

### 2.2 Update Transaction (Inline Edit)
* **Routes:** `PATCH /api/transactions/{id}`, `PATCH /transactions/{id}`
* **Path Parameters:**
  * `id` (`integer`, required): Unique transaction identifier.

#### Request JSON Body Fields
*Note: All fields are optional. Omitted fields will not be altered.*

| Field | Type | Required | Allowed / Possible Values | Description |
| :--- | :--- | :--- | :--- | :--- |
| `category` | `string` | No | `"Food"`, `"Transport"`, `"Shopping"`, `"Health"`, `"Utilities"`, `"Entertainment"`, `"Other"`, `""`, `null` | Setting `""` or `null` uncategorizes the transaction. |
| `mode_of_payment` | `string` | No | `"UPI"`, `"Card"`, `""`, `null` | Setting `""` or `null` clears the payment mode. |
| `description` | `string` | No | Any string | Updates the transaction description. |

#### Response JSON Body Fields
Returns the updated transaction object matching the schema described in **List Transactions**.

---

## 3. Statistics API

### 3.1 Get Stats
* **Routes:** `GET /api/stats`, `GET /stats`

#### Query Parameters
Same query parameters as **List Transactions** (`date`, `from`, `to`).

#### Response JSON Body Fields
| Field | Type | Possible Values | Description |
| :--- | :--- | :--- | :--- |
| `total_spend` | `number` | Any positive number or `0.0` | Sum of transaction amounts for the selected date filter range. |
| `category_breakdown` | `object` | `{ "Food": number, "Transport": number, ... }` | Key-value pairs matching allowed category names to their respective spend totals. |
| `seven_day_trend` | `array` | List of `{ "date": "YYYY-MM-DD", "amount": number }` | Spend trend data grouped by day. |
| `todays_haul` | `number` | Any positive number or `0.0` | Sum of transaction amounts for the current local calendar day. |
| `flagged_count` | `integer` | Non-negative integer | Total count of transactions in the filter range that are $\ge 2000.0$ (configured threshold). |
