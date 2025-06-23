# ISP_ChatBot--whatsapp
WhatsApp Chatbot which provide ISP Service to User

WhatsApp Bot Feature Specification for ISP Customers (Splynx Integration)

Objective:
To develop a WhatsApp chatbot that allows customers to interact with their internet service
account using WhatsApp, connected to our self-hosted Splynx system via API.

�� Main Menu – First Message:
Please choose from the options below:
��������1- View account information and data usage
���2- Recharge via voucher
��3- Check balance
���4- Change service plan
��5- Support & Auto-Replies


������� 1. View Account Information and Usage
Bot Reply Example:
����Account Info:
����Username:
����Name:
�����Plan:
����������������Expiry Date
��Speed:
����������Balance:
���Status:�Online
������Data Used:
������Remaining:
Suggested Splynx API Endpoints:
• GET /admin/customers – to fetch customer profile
• GET /admin/customers-services – to retrieve current plan
• GET /admin/customers/:id/internet-services-usage – for usage statistics
• GET /admin/customers/:id/main-balance – for current balance
• GET /admin/customers/:id/online-status – (if available)

��� 2. Recharge via Voucher
Flow:
• User sends: Recharge 1234567890
• Bot validates and replies:
o �If invalid: This voucher does not exist or has already been used.
o ��If valid: Recharge successful. New balance: 47.50 LYD.
Suggested API:
• POST /admin/vouchers/redeem

�� 3. Check Balance
Bot Reply:
��Your current balance is: 0.00 LYD
Suggested API:
• GET /admin/customers/:id/main-balance

��� 4. Change Service Plan
Flow:
• Bot shows available plans:
markdown
1. BAYTTE – 4 Mbps – 50 LYD
2. MAX – 10 Mbps – 120 LYD
3. INFINITY – 12 Mbps – 180 LYD
• User selects option
• Bot confirms plan update
Suggested API:
• PUT /admin/customers-services/:id
(Requires passing the new service ID or plan ID)

�� 5. Auto-Replies for Support
Example Keywords and Replies:
• Message: Support, Contact
Bot: Please call 091-XXX-XXXX or reply "agent" to speak with a representative.
• Message: Slow, Internet problem
Bot: Try restarting your router. If issue persists, reply "test" for a speed check.
Backend Action:
No API needed unless you want to log user inquiries.

���� Additional Notes:
• Customer should be matched by WhatsApp phone number → Splynx customer
login or ID
• Splynx API access token will be required (basic or bearer auth)
• Secure server to host webhook endpoint (Python, Node.js, etc.)