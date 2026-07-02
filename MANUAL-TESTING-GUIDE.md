# Manual Testing Guide: MSC Trust Inventory System

Now that the automated backend verifications have successfully passed, follow this guide to manually verify all the newly implemented features directly through the user interface.

## Prerequisites

Ensure the local server is running (`node server.js`). 

You can log in using:
- **Admin**: Username: `admin`, Password: `admin`
- **Staff (Branch 1)**: Username: `staff1`, Password: `staff1`
- **Staff (Branch 2)**: Username: `staff2`, Password: `staff2`

---

## 1. Branch Filtering and Global Items

**Test Steps:**
1. Log in as a **Staff** user (e.g., `staff1`).
2. Verify that the inventory list only displays items assigned specifically to `Branch 1`, plus any "Global/Unassigned" items.
3. Log out and log in as **Admin**.
4. In the top navigation, you should see a **Branch Switcher** dropdown.
5. Toggle the branch switcher. Verify that the inventory table automatically updates to show only items for the selected branch (plus global items). 

---

## 2. Inventory Movements (Inward / Outward / Transfer)

**Test Steps:**
1. As an **Admin** or **Staff**, locate an item and click the **Movement (arrows)** button.
2. Ensure the movement modal now has three tabs: **Inward**, **Outward**, and **Transfer**.

**Inward:**
1. Select "Inward".
2. Enter a quantity, supplier name, and optionally attach an invoice document.
3. Submit and verify the stock is correctly incremented.

**Outward:**
1. Select "Outward".
2. Enter a quantity and a **Recipient Name** (new field). Optionally select a Program.
3. Submit and verify the stock is correctly decremented. Check the movement history to see the recipient name recorded.

**Transfer:**
1. Select "Transfer".
2. Select a destination branch from the dropdown and enter a quantity.
3. Submit and verify the stock decreases in your branch. Switch to the destination branch (as Admin) and verify the stock has increased there.

---

## 3. Deletion Requests (With Partial Quantities and Reasons)

**Test Steps:**
1. As **Staff**, click the **Request Deletion (trash icon)** button on an item.
2. In the modal, observe the new **Quantity** field and the **Reason** dropdown.
3. Select the reason **"Mistake"**. Enter a quantity less than the total stock. Submit.
4. Open another deletion request for the *same* item, select the reason **"Resale"**. Notice that a new **Price (₹)** field appears. Enter a price and submit.
5. Attempt to request deletion for more units than the currently available stock (total stock minus pending requests). The system should block this and show an error message.
6. Log out and log in as **Admin**.
7. Navigate to the **Deletion Requests** page.
8. Verify that the **Reason** column is wide enough to display details comfortably, and that both the requested **Quantity** and any **Resale Price** are visible.
9. Approve the requests. Verify that the item's stock is reduced by the requested quantities. If the total stock hits 0 due to approvals, the item will be automatically soft-deleted.

---

## 4. Bulk Import

**Test Steps:**
1. As **Admin**, navigate to the Inventory page.
2. Click the **Import CSV/Excel** button.
3. Click **Download Template** and open the downloaded `.xlsx` file.
4. Fill in a few test rows. Ensure you provide valid values for `Item Name`, `Branch Name` (or leave blank for Global), `Initial Stock`, `Unit`, and `Threshold`.
5. Upload the completed template via the **Import CSV/Excel** modal.
6. Verify the success message and check that the new items appear in the inventory table.

---

## 5. Branch Management (Soft Deletes)

**Test Steps:**
1. As **Admin**, click on **Manage Branches** in the top navigation.
2. Add a new branch.
3. Edit the newly added branch to verify updates work.
4. Click the **Deactivate (Trash)** icon next to the branch.
5. Verify that the branch disappears from the list, confirming it has been soft-deleted instead of permanently deleted from the database.

---

## 6. Reports and Exports

**Test Steps:**
1. As **Admin**, click on **Reports** in the top navigation.
2. Under "Inventory Summary", select "All Branches" and click Download. Verify the exported Excel file contains a "Trust-Wide Summary" sheet followed by individual sheets for each branch.
3. Under "Movement History", select a month and year, and click Download. Verify the generated Excel file details the stock flow correctly.

---

**Testing Complete.** If you encounter any unexpected behavior, please let me know so we can refine it!
