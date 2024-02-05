/**
* InvoiceGeneratorControllerTest
* Test class for the InvoiceGeneratorController.
*
* @author  Martín Messina
* @date   02-03-2024
*/

@isTest
private class InvoiceGeneratorControllerTest {
    
    @testSetup 
    private static void testSetup(){
        // Creates the test data that will be used in the unit tests.

        List<User> users = new List<User>();
        
        List<Profile> profiles = [
            SELECT Id 
            FROM Profile 
            WHERE Name 
            IN ('Standard User', 'Standard User Clone') 
            ORDER BY Name ASC
        ];
        
        Profile standard = profiles[0];
        Profile standardClone = profiles[1];
       
        User standardUser = new User(
                Alias = 'standard', 
                Email='standarduser@expeditecommerce.com',
                EmailEncodingKey='UTF-8', 
                LastName='No Invoice Access User', 
                LanguageLocaleKey='en_US',
                LocaleSidKey='en_US', 
                ProfileId = standard.Id,
                TimeZoneSidKey='America/Argentina/Buenos_Aires', 
                UserName='standarduser@expeditecommerce.com'
        );

        users.add(standardUser);
       
        User standardUserClone = new User(
                Alias = 'sclone', 
                Email='standarduserclone@expeditecommerce.com',
                EmailEncodingKey='UTF-8', 
                LastName='No Invoice Line Item Access User', 
                LanguageLocaleKey='en_US',
                LocaleSidKey='en_US', 
                ProfileId = standardClone.Id,
                TimeZoneSidKey='America/Argentina/Buenos_Aires', 
                UserName='standarduserclone@expeditecommerce.com'
        );

        users.add(standardUserClone);

        insert users;

        Account acct = new Account(
            Name = 'TechBolt Solutions',
            Website = 'www.techboltsolutions.com',
            Description = 'TechBolt Solutions is a dynamic and forward-thinking technology company at the forefront of innovation.' + 
            ' Established with a passion for pushing the boundaries of what\'s possible in the tech world, ' + 
            'they specialize in providing cutting-edge solutions that empower businesses to thrive in the digital age.',
            AnnualRevenue = 50000000,
            Industry = 'Technology',
            BillingStreet = '123 Tech Avenue',
            BillingCity = 'Silicon Valley',
            BillingState = 'CA',
            BillingPostalCode = '95051',
            BillingCountry = 'United States',
            ShippingStreet = '123 Tech Avenue',
            ShippingCity = 'Silicon Valley',
            ShippingState = 'CA',
            ShippingPostalCode = '95051',
            ShippingCountry = 'United States'
        );

        insert acct;

        List<Product2> products = new List<Product2>();

        Product2 dataShield = new Product2(
            Name = 'DataShield Enterprise Security Suite',
            IsActive = true,
            ProductCode = '20013',
            Description = 'An advanced cybersecurity solution offering a suite of security services, including threat detection, firewall protection, and encryption. The activation date for DataShield marks the initiation of the cybersecurity services for the customer. This could be crucial for tracking the start of protection and aligning with billing cycles.'
        );

        products.add(dataShield);

        Product2 techCare = new Product2(
            Name = 'TechCare Premium Support Subscription',
            IsActive = true,
            ProductCode = '20012',
            Description = 'A comprehensive premium support subscription service that provides 24/7 assistance, priority access to tech experts, and regular software updates. Customers subscribing to TechCare Premium Support will have an activation date marking the beginning of their subscription period, allowing them to access premium support services.'
        );

        products.add(techCare);

        insert products;

        List<PricebookEntry> pbes = new List<PricebookEntry>();

        Id standardPricebookId = Test.getStandardPricebookId();

        PricebookEntry pbeDataShield = new PricebookEntry(
            UnitPrice = 499.99, 
            PriceBook2Id = standardPricebookId, 
            Product2Id = dataShield.Id, 
            IsActive = true
        );

        pbes.add(pbeDataShield);  

        PricebookEntry pbeTechCare = new PricebookEntry(
            UnitPrice = 99.99, 
            PriceBook2Id = standardPricebookId, 
            Product2Id = techCare.Id, 
            IsActive = true
        );
        
        pbes.add(pbeTechCare);  

        insert pbes;

        // Set the first Status field picklist value as the default
        Schema.DescribeSObjectResult orderDescribe = Order.sObjectType.getDescribe();
        Schema.DescribeFieldResult statusFieldDescribe = orderDescribe.fields.getMap().get('Status').getDescribe();
        List<Schema.PicklistEntry> statusPicklistValues = statusFieldDescribe.getPicklistValues();
        String defaultStatus = statusPicklistValues[0].getValue();

        Order order = new Order(
            AccountId = acct.Id,
            Pricebook2Id = standardPricebookId,
            EffectiveDate = System.today(),
            Status = defaultStatus
        );

        insert order;

        List<OrderItem> ots = new List<OrderItem>();

        OrderItem otDataShield = new OrderItem(
            UnitPrice = pbeDataShield.UnitPrice, 
            Product2Id = dataShield.Id,
            PricebookEntryId = pbeDataShield.Id,
            OrderId = order.Id,
            Quantity = 1,
            ServiceDate = System.today()
        );

        ots.add(otDataShield);

        OrderItem otTechCare = new OrderItem(
            UnitPrice = pbeTechCare.UnitPrice,
            Product2Id = dataShield.Id,
            PricebookEntryId = pbeTechCare.Id,
            OrderId = order.Id,
            Quantity = 1,
            ServiceDate = System.today()
        );

        ots.add(otTechCare);

        insert ots;

        Assert.areEqual(499.99, otDataShield.UnitPrice, 'DataShield Product UnitPrice is not correct.');
        Assert.areEqual(99.99, otTechCare.UnitPrice, 'TechCare Product UnitPrice is not correct.');

    }

    @isTest
    private static void getOrderItemsTest(){
        // Testing fetching Order Line Items.
        Test.startTest();
        Account acct = [SELECT Id FROM Account WHERE Name = 'TechBolt Solutions'];

        Order order = [SELECT Id FROM Order WHERE AccountId = :acct.Id];

        List<OrderItem> ots = InvoiceGeneratorController.getOrderItems(order.Id);

        Test.stopTest();
        
        Assert.areEqual(2, ots.size(), 'Order Line Items were not retrieved.');
    }

    @isTest
    private static void createInvoicePositiveTest(){
        // Testing creating invoice with 1 order with 2 order line items.
        Test.startTest();

        Account acct = [SELECT Id FROM Account WHERE Name = 'TechBolt Solutions'];

        Order order = [SELECT Id FROM Order WHERE AccountId = :acct.Id];

        List<OrderItem> ots = [
            SELECT
            Product2Id,
            UnitPrice,
            Quantity,
            TotalPrice,
            ServiceDate,
            OrderId
            FROM OrderItem
            WHERE OrderId = :order.Id
            WITH SECURITY_ENFORCED
        ];

        Id invoiceId = InvoiceGeneratorController.createInvoice(ots);

        Invoice__c invoice = [
            SELECT Id, Name 
            FROM Invoice__c 
            WHERE Order__c = :order.Id 
        ];

        Assert.areEqual(invoiceId, invoice.Id, 'The Invoice was not properly created.');

        List<InvoiceItem__c> invoiceItems = [
            SELECT 
            InvoiceDate__c, 
            OrderItem__c,
            Status__c
            FROM InvoiceItem__c 
            WHERE Invoice__c = :invoice.Id
            ORDER BY OrderItem__r.Product2.Name ASC
        ];

        Test.stopTest();

        for(InvoiceItem__c invoiceItem:invoiceItems){
            Assert.areEqual(System.today(), invoiceItem.InvoiceDate__c, 'The Invoice Item activation date is not correct.');
            Assert.areEqual('Draft', invoiceItem.Status__c, 'The Invoice Item Status is not correct.');
        }

        InvoiceItem__c invoiceDataShield = invoiceItems[0];
        InvoiceItem__c invoiceTechCare = invoiceItems[1];

        OrderItem otDataShield = ots[0];
        OrderItem otTechCare = ots[1];

        Assert.areEqual(otDataShield.Id, invoiceDataShield.OrderItem__c, 'The Invoice Item Order Item is not correct.');
        Assert.areEqual(otTechCare.Id, invoiceTechCare.OrderItem__c, 'The Invoice Item Order Item is not correct.');
    }

    @isTest
    private static void createInvoiceNegativeTest(){
        // Testing creating invoice with 1 order with 2 order line items that do not have activation date.

        Test.startTest();

        Account acct = [SELECT Id FROM Account WHERE Name = 'TechBolt Solutions'];

        Order order = [SELECT Id FROM Order WHERE AccountId = :acct.Id];

        List<OrderItem> otsCloned = new List<OrderItem>();

        for(OrderItem ot:[
            SELECT
            Product2Id,
            UnitPrice,
            Quantity,
            TotalPrice,
            ServiceDate,
            OrderId,
            PricebookEntryId
            FROM OrderItem
            WHERE OrderId = :order.Id
            WITH SECURITY_ENFORCED
        ]){
            OrderItem otClone = ot.clone(false, true, false, false);
            otClone.ServiceDate = null;
            otsCloned.add(otClone);
        }

        insert otsCloned;

        List<OrderItem> otsNotActivated = [
            SELECT 
            Product2Id,
            UnitPrice,
            Quantity,
            TotalPrice,
            ServiceDate,
            OrderId,
            PricebookEntryId 
            FROM OrderItem 
            WHERE ServiceDate = null
        ];

        try{
            InvoiceGeneratorController.createInvoice(otsNotActivated);
        }
        catch(AuraHandledException e){
            Assert.areEqual('Insert failed. First exception on row 0; first error: REQUIRED_FIELD_MISSING, Required fields are missing: [InvoiceDate__c]: [InvoiceDate__c]', e.getMessage(), 'REQUIRED_FIELD_MISSING Exception was not thrown.');
        }

        Test.stopTest();
    }

    @isTest
    private static void createInvoiceBulkTest(){
        // Testing creating invoice with 1 order with 1000 order line items.

        Test.startTest();

        List<Product2> products = new List<Product2>();

        for(Integer i=0; i<1000; i++){
            Product2 techCare = new Product2(
                Name = 'TechCare Premium Support Subscription ' + i,
                IsActive = true,
                ProductCode = '20012' + i,
                Description = 'A comprehensive premium support subscription service that provides 24/7 assistance, priority access to tech experts, and regular software updates. Customers subscribing to TechCare Premium Support will have an activation date marking the beginning of their subscription period, allowing them to access premium support services.'
            );
    
            products.add(techCare);
        }

        insert products;

        List<PricebookEntry> pbes = new List<PricebookEntry>();

        Id standardPricebookId = Test.getStandardPricebookId();

        for(Product2 product:products){
            PricebookEntry pbe = new PricebookEntry(
                UnitPrice = 99.99, 
                PriceBook2Id = standardPricebookId, 
                Product2Id = product.Id, 
                IsActive = true
            );
            pbes.add(pbe);
        }

        insert pbes;

        // Set the first Status field picklist value as the default
        Schema.DescribeSObjectResult orderDescribe = Order.sObjectType.getDescribe();
        Schema.DescribeFieldResult statusFieldDescribe = orderDescribe.fields.getMap().get('Status').getDescribe();
        List<Schema.PicklistEntry> statusPicklistValues = statusFieldDescribe.getPicklistValues();
        String defaultStatus = statusPicklistValues[0].getValue();

        Account acct = [SELECT Id FROM Account WHERE Name = 'TechBolt Solutions'];

        Order order = new Order(
            AccountId = acct.Id,
            Pricebook2Id = standardPricebookId,
            EffectiveDate = System.today(),
            Status = defaultStatus
        );

        insert order;

        List<OrderItem> ots = new List<OrderItem>();

        for(PricebookEntry pbe:pbes){
            OrderItem ot = new OrderItem(
                UnitPrice = pbe.UnitPrice, 
                Product2Id = pbe.Product2Id,
                PricebookEntryId = pbe.Id,
                OrderId = order.Id,
                Quantity = 1,
                ServiceDate = System.today()
            );
    
            ots.add(ot);
        }

        insert ots;

        Id invoiceId = InvoiceGeneratorController.createInvoice(ots);

        Invoice__c invoice = [
            SELECT Id, Name 
            FROM Invoice__c 
            WHERE Order__c = :order.Id 
        ];

        Assert.areEqual(invoiceId, invoice.Id, 'The Invoice was not properly created.');

        List<InvoiceItem__c> invoiceItems = [
            SELECT 
            InvoiceDate__c, 
            OrderItem__c,
            Status__c
            FROM InvoiceItem__c 
            WHERE Invoice__c = :invoice.Id
            ORDER BY OrderItem__r.Product2.Name ASC
        ];

        Test.stopTest();

        for(InvoiceItem__c invoiceItem:invoiceItems){
            Assert.areEqual(System.today(), invoiceItem.InvoiceDate__c, 'The Invoice Item activation date is not correct.');
            Assert.areEqual('Draft', invoiceItem.Status__c, 'The Invoice Item Status is not correct.');
        }

    }

    @isTest
    private static void createInvoiceSecurityInvoicesTest(){
        // Testing creating invoice with a user that does not have access to Invoice creation.
        // 'No Invoice Access User' does not have access to invoices nor invoice line items creation.
        User u = [SELECT Id FROM User WHERE LastName = 'No Invoice Access User'];

        System.runAs(u){
            try{
                createInvoicePositiveTest();
            }
            catch(AuraHandledException e){
                Assert.areEqual('Insufficient permissions to create Invoices', e.getMessage(), 'Security Exception was not thrown.');
            }
        }
    }

    @isTest
    private static void createInvoiceSecurityInvoiceItemsTest(){
        // Testing creating invoice with a user that does not have access to Invoice Line Item creation.
        // 'No Invoice Line Item Access User' is allowed to create invoices but not invoice line items.
        User u = [SELECT Id FROM User WHERE LastName = 'No Invoice Line Item Access User'];

        System.runAs(u){
            try{
                createInvoicePositiveTest();
            }
            catch(AuraHandledException e){
                Assert.areEqual('Insufficient permissions to create Invoice Line Items', e.getMessage(), 'Security Exception was not thrown.');
            }
        }
    }
}