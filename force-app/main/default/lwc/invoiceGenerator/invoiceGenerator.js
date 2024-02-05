/**
 * @file UI to create invoices from the Order record detail page.
 * @author Martin Messina @ 02-03-2024
 */

import { api, wire } from 'lwc';
import { CloseActionScreenEvent } from 'lightning/actions';
import getOrderItems from '@salesforce/apex/InvoiceGeneratorController.getOrderItems';
import createInvoice from '@salesforce/apex/InvoiceGeneratorController.createInvoice';
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { NavigationMixin } from 'lightning/navigation';
import { reduceErrors } from 'c/ldsUtils';
import INVOICE_OBJECT from "@salesforce/schema/Invoice__c";
import LightningModal from 'lightning/modal';

const COLUMNS = [
    { label: 'Order Product', fieldName: 'ProductName', displayReadOnlyIcon: true,  wrapText: true},
    { label: 'Invoice Date', fieldName: 'ServiceDate', type: 'date', editable:true },
    { label: 'Unit Price', fieldName: 'UnitPrice', type: 'currency', displayReadOnlyIcon: true },
    { label: 'Quantity', fieldName: 'Quantity', type: 'number', displayReadOnlyIcon: true },
    { label: 'Total Price', fieldName: 'TotalPrice', type: 'currency', displayReadOnlyIcon: true },
];

export default class InvoicesGenerator extends NavigationMixin(LightningModal) {
    @api recordId;
    // @api objectApiName;

    columns = COLUMNS;
    orderItems = [];
    storedValuesMap = new Map();

    isLoading = true;

    successTitle = `Success`;
    successMessage = `Invoice created successfully.`;
    noRecordsTitle = `Oops!`;
    noRecordsMessage = `It looks like there are no activation dates set. To proceed with creating an invoice, kindly set at least one Invoice Date.`;
    errorTitle = `Error`;

    closeModal = new CloseActionScreenEvent();

    @wire(getOrderItems, {orderId:'$recordId'})
    getOrderItems({ error, data }){
        // Fetches Order Line Items based on current Order Id.
        if(data){
            if(!data.length){
                this.orderItems = undefined;
                this.error = new Error('Order does not have Order Products. Add Order Products to your Order and try again.');
            }
            else{
                this.orderItems = data.map(data => ({
                    ...data,
                    ProductName: data.Product2.Name
                }));
                this.error = undefined;
            }
            this.isLoading = false;

        }
        else if(error){
            this.orderItems = undefined;
            this.error = error;
            this.isLoading = false;
        }

    }

    handleDismiss(){
        // Closes modal when cancel button is clicked.
        this.dispatchEvent(this.closeModal);
    }

    async handleSave(){
        // Handles invoice form submission.
        let storedValues = Array.from(this.storedValuesMap.values());
        // Only records with a valid (not null, nor empty) ServiceDate are sent to the database.
        let filteredValues = storedValues.filter(value => value.ServiceDate?.length);

        if(filteredValues.length){
            // Passing Order Id in first record.
            filteredValues[0].OrderId = this.recordId;
            try{
                let invoiceId = await createInvoice({ orderItems: filteredValues });
                this.throwToast(this.successTitle, 'success', this.successMessage);
                this.navigateToInvoice(invoiceId);
            }
            catch(error){
                this.throwToast(this.errorTitle, 'error', reduceErrors(error).join(', '));
            }
        }
        else{
            // If there are no records with a defined ServiceDate or the draftValues array is empty, Apex is not called.
            this.throwToast(this.noRecordsTitle, 'warning', this.noRecordsMessage);
        }
    }

    handleChange(event){
        // Handles form individual cell's modification.
        let draftValues = event.detail.draftValues;
        draftValues.forEach(draftValue => {
            this.storedValuesMap.set(draftValue.Id, draftValue);
        });
    }

    throwToast(title, variant, message) {
        // Handles toast creation and display.
        this.dispatchEvent(
          new ShowToastEvent({
            title: title,
            variant: variant,
            message: message
          })
        );
      }

    navigateToInvoice(invoiceId){
        // Navigates to newly created Invoice record detail page.
        const pageReference = {
            type: 'standard__recordPage',
            attributes: {
                recordId: invoiceId,
                objectApiName: INVOICE_OBJECT,
                actionName: 'view'
            }
        }

        this[NavigationMixin.Navigate](pageReference);
    }

}