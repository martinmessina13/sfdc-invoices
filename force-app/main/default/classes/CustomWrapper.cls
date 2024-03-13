public with sharing class CustomWrapper {
    @AuraEnabled
    public Id orderId { get; set; }
    @AuraEnabled
    public Integer pageOffset { get; set; }
    @AuraEnabled
    public Integer pageRecords { get; set; }
}