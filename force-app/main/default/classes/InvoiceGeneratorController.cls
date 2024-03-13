/**
* InvoiceGeneratorController
* Controller for the invoiceGenerator Lightning web component.
*
* @author  Martín Messina
* @date   02-03-2024
*/

public with sharing class InvoiceGeneratorController {

    @AuraEnabled(cacheable=true)
    public static Integer getOrderItemsCount(Id orderId){
        // Returns the total of Order Items stored in the database.
        return [
            SELECT COUNT()
            FROM OrderItem
            WHERE OrderId = :orderId
            WITH SECURITY_ENFORCED
        ];
    }

    @AuraEnabled(cacheable=true) 
    public static List<OrderItem> getOrderItems(CustomWrapper wrapper){
        // Fetches OrderItems using the Order Id obtained from the current context.
        return [
            SELECT
            Product2.Name,
            UnitPrice,
            Quantity,
            TotalPrice
            FROM OrderItem
            WHERE OrderId = :wrapper.orderId
            WITH SECURITY_ENFORCED
            ORDER BY Product2.Name ASC
            LIMIT :wrapper.pageRecords
            OFFSET :wrapper.pageOffset
        ];
    }

    @AuraEnabled
    public static Id createInvoice(List<OrderItem> orderItems){
        // Creates Invoice and related Invoice Line Items from OrderItems.
        try {
            // Assigning Order Id.
            Id orderId = orderItems[0].OrderId;

            // Create Invoice
            Invoice__c invoice = new Invoice__c(
                Order__c = orderId
            );

            // Validate CRUD permissions
            if(Schema.sObjectType.Invoice__c.isCreateable()) {
                insert invoice;
            }
            else{
                throw new SecurityException(
                    'Insufficient permissions to create Invoices'
                );
            }

            List<InvoiceItem__c> invoiceItems = new List<InvoiceItem__c>();   

            for(OrderItem orderItem:orderItems){
                // Populates InvoiceItem__c new object to default values.

                InvoiceItem__c invoiceItem = (InvoiceItem__c)InvoiceItem__c.SObjectType.newSObject(null, true);
                
                invoiceItem.InvoiceDate__c = orderItem.ServiceDate;
                invoiceItem.OrderItem__c = orderItem.Id;
                invoiceItem.Invoice__c = invoice.Id;

                invoiceItems.add(invoiceItem);
            }

            if(Schema.sObjectType.InvoiceItem__c.isCreateable()) {
                insert invoiceItems;
            }
            else{
                throw new SecurityException(
                    'Insufficient permissions to create Invoice Line Items'
                );
            }

            return invoice.Id;
        } catch (Exception e) {
            throw newMessageException(e.getMessage());
        }
    }

    private static AuraHandledException newMessageException(String message) {
        AuraHandledException e = new AuraHandledException(message);
        e.setMessage(message);
        return e;
    }
}