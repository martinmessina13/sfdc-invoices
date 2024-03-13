import { createElement } from 'lwc';
import InvoiceGenerator from 'c/invoiceGenerator';
import { CloseScreenEventName } from 'lightning/actions';
import getOrderItems from '@salesforce/apex/InvoiceGeneratorController.getOrderItems';
import createInvoice from '@salesforce/apex/InvoiceGeneratorController.createInvoice';
import { ShowToastEventName } from 'lightning/platformShowToastEvent';

// Realistic data with a list of contacts
const mockGetOrderItemsList = require('./data/getOrderItems.json');

const DRAFT_VALUES = [
    {
        "Id": "802an000000AePBAA0",
        "ServiceDate": "2024-02-10T01:56:51.541Z",
        "OrderId":"801an000002s14QAAQ"
    },
    {
        "Id": "01tan000000JhMEAA0",
        "ServiceDate": "2024-02-10T01:56:51.541Z",
        "OrderId":"801an000002s14QAAQ"
    }
];

// Mock getOrderItems Apex wire adapter
jest.mock(
    '@salesforce/apex/InvoiceGeneratorController.getOrderItems',
    () => {
        const {
            createApexTestWireAdapter
        } = require('@salesforce/sfdx-lwc-jest');
        return {
            default: createApexTestWireAdapter(jest.fn())
        };
    },
    { virtual: true }
);

// Mock createInvoice
jest.mock(
    '@salesforce/apex/InvoiceGeneratorController.createInvoice',
    () => {
        return {
            default: jest.fn(() => Promise.resolve())
        };
    },
    { virtual: true }
);

// Sample error for Apex call
const CREATE_INVOICE_ERROR = {
    body: { message: 'An internal server error has occurred' },
    ok: false,
    status: 400,
    statusText: 'Bad Request'
};

describe('c-invoice-generator', () => {
    afterEach(() => {
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }

        // Prevent data saved on mocks from leaking between tests
        jest.clearAllMocks();

    });

     // Helper function to wait until the microtask queue is empty.
     async function flushPromises() {
        return Promise.resolve();
    }

    async function selectDatatableRows(datatable){
        const firstValue = [
            {
                "Id": "802an000000AePBAA0",
                "ServiceDate": "2024-02-10T01:56:51.541Z",
                "OrderId":"801an000002s14QAAQ"
            }
        ];

        datatable.dispatchEvent(
            new CustomEvent('cellchange', {
                detail: {
                    draftValues: firstValue
                }
            })
        )

        const secondValue = [
            {
                "Id": "01tan000000JhMEAA0",
                "ServiceDate": "2024-02-10T01:56:51.541Z",
                "OrderId":"801an000002s14QAAQ"
            }
        ];

        datatable.dispatchEvent(
            new CustomEvent('cellchange', {
                detail: {
                    draftValues: secondValue
                }
            })
        )
    }

    it('updates the records on save', async () => {
        const INPUT_PARAMETERS = [{ orderItems: DRAFT_VALUES }];

        // Create component
        const element = createElement('c-invoice-generator', {
            is: InvoiceGenerator
        });
        element.recordId = '801an000002s14QAAQ';

        // Inserting component in DOM
        document.body.appendChild(element);

        expect(element.recordId).toBe('801an000002s14QAAQ');

        // Emit data from @wire
        getOrderItems.emit(mockGetOrderItemsList);

        // Wait for any asynchronous DOM updates
        await flushPromises();

        // Update multiple records with the INPUT_PARAMETERS and simulate the Save event
        const saveButton = element.modalFooter$$('lightning-button')[1];

        // Checking that the Save button was the one queried
        expect(saveButton).not.toBeNull();
        expect(saveButton.label).toBe('Save');

        // Query the datatable
        const datatable = element.shadowRoot.querySelector('lightning-datatable');

        // Active two order line items from the datatable in a sequential manner
        const firstValue = [
            {
                "Id": "802an000000AePBAA0",
                "ServiceDate": "2024-02-10T01:56:51.541Z",
                "OrderId":"801an000002s14QAAQ"
            }
        ];

        datatable.dispatchEvent(
            new CustomEvent('cellchange', {
                detail: {
                    draftValues: firstValue
                }
            })
        );

        const secondValue = [
            {
                "Id": "01tan000000JhMEAA0",
                "ServiceDate": "2024-02-10T01:56:51.541Z",
                "OrderId":"801an000002s14QAAQ"
            }
        ];

        datatable.dispatchEvent(
            new CustomEvent('cellchange', {
                detail: {
                    draftValues: secondValue
                }
            })
        );

        // Triggering save event
        saveButton.click();

        // Validate createInvoice call
        expect(createInvoice).toHaveBeenCalled();

        // Validate that the OrderId was set to the first element of the input parameters array
        const receivedInputParameters = createInvoice.mock.calls[0];
        const firstElement = receivedInputParameters[0];
        const firstOrderItem = firstElement.orderItems[0];

        expect(firstOrderItem.OrderId).toBe('801an000002s14QAAQ');
        
        // Validate the creation call is made with correct input parameters
        expect(receivedInputParameters).toEqual(INPUT_PARAMETERS);
    });

    it('rendering 2 rows in the datatable', async () => {
        // Create component
        const element = createElement('c-invoice-generator', {
            is: InvoiceGenerator
        });

        // Inserting component in DOM
        document.body.appendChild(element);

        // Emit data from @wire
        getOrderItems.emit(mockGetOrderItemsList);

        // Wait for any asynchronous DOM updates
        await flushPromises();

        const datatable = element.shadowRoot.querySelector('lightning-datatable');

        // Validate the datatable is populated with correct number of records
        expect(datatable.data.length).toBe(mockGetOrderItemsList.length);

        // Validate that the rendered product names are correct
        for(let i = 0; i < datatable.data.length; i++){
            expect(datatable.data[i].ProductName).toBe(mockGetOrderItemsList[i].ProductName);
        }

    });

    it('is accessible when data is returned', async () => {
        const element = createElement('c-invoice-generator', {
            is: InvoiceGenerator
        });
        // Inserting component in DOM
        document.body.appendChild(element);

        // Emit data from @wire
        getOrderItems.emit(mockGetOrderItemsList);

        // Wait for any asynchronous DOM updates
        await flushPromises();

        // Check accessibility
        await expect(element).toBeAccessible();
    });

    it('is accessible when error is returned', async () => {
        // Create component
        const element = createElement('c-invoice-generator', {
            is: InvoiceGenerator
        });
        // Inserting component in DOM
        document.body.appendChild(element);

        // Emit error from @wire
        getOrderItems.error();

        // Wait for any asynchronous DOM updates
        await flushPromises();

        // Check accessibility
        await expect(element).toBeAccessible();
    });

    it('displays error toast when the server returns an error', async () => {
        const element = new createElement('c-invoice-generator',{
            is: InvoiceGenerator
        });

        // Inserting component in DOM
        document.body.appendChild(element);

        // Mock handler for toast event
        const toastHandler = jest.fn();

        // Add event listener to catch toast event
        element.addEventListener(ShowToastEventName, toastHandler);

        // Emit data from @wire
        getOrderItems.emit(mockGetOrderItemsList);

        // Wait for any asynchronous DOM updates
        await flushPromises();

        // Assign mock value for rejected createInvoice promise
        createInvoice.mockRejectedValue(CREATE_INVOICE_ERROR);

        // Update multiple records with the INPUT_PARAMETERS and simulate the Save event
        const saveButton = element.modalFooter$$('lightning-button')[1];

        // Checking that the Save button was the one queried
        expect(saveButton).not.toBeNull();
        expect(saveButton.label).toBe('Save');

        // Query the datatable
        const datatable = element.shadowRoot.querySelector('lightning-datatable');

        // Active two order line items from the datatable in a sequential manner
        const firstValue = [
            {
                "Id": "802an000000AePBAA0",
                "ServiceDate": "2024-02-10T01:56:51.541Z",
                "OrderId":"801an000002s14QAAQ"
            }
        ];

        datatable.dispatchEvent(
            new CustomEvent('cellchange', {
                detail: {
                    draftValues: firstValue
                }
            })
        );

        const secondValue = [
            {
                "Id": "01tan000000JhMEAA0",
                "ServiceDate": "2024-02-10T01:56:51.541Z",
                "OrderId":"801an000002s14QAAQ"
            }
        ];

        datatable.dispatchEvent(
            new CustomEvent('cellchange', {
                detail: {
                    draftValues: secondValue
                }
            })
        );

        // Triggering save event
        saveButton.click();

        // Wait for any asynchronous DOM updates
        await flushPromises();

        // Validate the toast event is called with error
        expect(toastHandler).toHaveBeenCalled();
        expect(toastHandler.mock.calls[0][0].detail.variant).toBe('error');

    });

    it('display success toast on form save', async () => {

        const INPUT_PARAMETERS = [{ orderItems: DRAFT_VALUES }];

        // Assign mock value for resolved createInvoice promise
        createInvoice.mockResolvedValue(INPUT_PARAMETERS);

        // Create component
        const element = createElement('c-invoice-generator', {
            is: InvoiceGenerator
        });
        element.recordId = '801an000002s14QAAQ';

        // Inserting component in DOM
        document.body.appendChild(element);

        // Mock handler for toast event
        const toastHandler = jest.fn();

        // Add event listener to catch toast event
        element.addEventListener(ShowToastEventName, toastHandler);

        // Emit data from @wire
        getOrderItems.emit(mockGetOrderItemsList);

        // Wait for any asynchronous DOM updates
        await flushPromises();

        // Update multiple records with the INPUT_PARAMETERS and simulate the Save event
        const saveButton = element.modalFooter$$('lightning-button')[1];

        // Checking that the Save button was the one queried
        expect(saveButton).not.toBeNull();
        expect(saveButton.label).toBe('Save');

        // Query the datatable
        const datatable = element.shadowRoot.querySelector('lightning-datatable');

        // Active two order line items from the datatable in a sequential manner
        const firstValue = [
            {
                "Id": "802an000000AePBAA0",
                "ServiceDate": "2024-02-10T01:56:51.541Z",
                "OrderId":"801an000002s14QAAQ"
            }
        ];

        datatable.dispatchEvent(
            new CustomEvent('cellchange', {
                detail: {
                    draftValues: firstValue
                }
            })
        );

        const secondValue = [
            {
                "Id": "01tan000000JhMEAA0",
                "ServiceDate": "2024-02-10T01:56:51.541Z",
                "OrderId":"801an000002s14QAAQ"
            }
        ];

        datatable.dispatchEvent(
            new CustomEvent('cellchange', {
                detail: {
                    draftValues: secondValue
                }
            })
        );

        // Triggering save event
        saveButton.click();

        // Wait for any asynchronous DOM updates
        await flushPromises();

        // Validate createInvoice call
        expect(createInvoice).toHaveBeenCalled();

        // Validate that the OrderId was set to the first element of the input parameters array
        const receivedInputParameters = createInvoice.mock.calls[0];
        const firstElement = receivedInputParameters[0];
        const firstOrderItem = firstElement.orderItems[0];

        expect(firstOrderItem.OrderId).toBe('801an000002s14QAAQ');
        
        // Validate the creation call is made with correct input parameters
        expect(receivedInputParameters).toEqual(INPUT_PARAMETERS);

        // Validate the toast event is called with success
        expect(toastHandler).toHaveBeenCalled();
        expect(toastHandler.mock.calls[0][0].detail.variant).toBe('success');
    });

    it('display warning toast on form save, without activated items', async () => {

        // Create component
        const element = createElement('c-invoice-generator', {
            is: InvoiceGenerator
        });

        // Inserting component in DOM
        document.body.appendChild(element);

        // Mock handler for toast event
        const toastHandler = jest.fn();

        // Add event listener to catch toast event
        element.addEventListener(ShowToastEventName, toastHandler);

        // Emit data from @wire
        getOrderItems.emit(mockGetOrderItemsList);

        // Wait for any asynchronous DOM updates
        await flushPromises();

        // Update multiple records with the INPUT_PARAMETERS and simulate the Save event
        const saveButton = element.modalFooter$$('lightning-button')[1];

        // Triggering save event, without activating items
        saveButton.click();

        // Wait for any asynchronous DOM updates
        await flushPromises();

        // Validate the toast event is called with success
        expect(toastHandler).toHaveBeenCalled();
        expect(toastHandler.mock.calls[0][0].detail.variant).toBe('warning');

        // Validate that createInvoice was not called
        expect(createInvoice).not.toHaveBeenCalled();
    });

    it('display error panel when there are no order items in order', async () => {
        // Create component
        const element = createElement('c-invoice-generator', {
            is:InvoiceGenerator
        });

        // Insert component in DOM
        document.body.appendChild(element);

        // Emit empty array from @wire
        getOrderItems.emit([]);

        // Wait for any asynchronous DOM updates
        await flushPromises();

        // Query datatable
        const datatable = element.shadowRoot.querySelector('lightning-datatable');

        // Validate the datatable is populated with correct number of records
        expect(datatable.data).toBeUndefined();

        // Query error panel
        const errorPanel = element.shadowRoot.querySelector('c-error-panel');

        // Valitade error message
        expect(errorPanel.errors.message).toBe('Order does not have Order Products. Add Order Products to your Order and try again.');

        // Validating that the error panel rendering
        expect(errorPanel).not.toBeNull();

         // Check accessibility
         await expect(element).toBeAccessible();
    });

    it('close event triggered when closing modal', async () => {

        // Create component
        const element = createElement('c-invoice-generator', {
            is: InvoiceGenerator
        });

        // Insert element in DOM
        document.body.appendChild(element);

        // Mock handler for toast event
        const handler = jest.fn();

        // Add event listener to catch toast event
        element.addEventListener(CloseScreenEventName, handler);

        // Query close button
        const closeButton = element.modalFooter$$('lightning-button')[0];

        // Closing modal
        closeButton.click();

        // Validate that closing event has been called
        expect(handler).toHaveBeenCalled();

    });

    it('displays new invoice label in the header', () => {

        // Create component
        const element = createElement('c-invoice-generator', {
            is: InvoiceGenerator
        });

        // Set the header public property
        const headerLabel = 'New Invoice';
        element.header = headerLabel;

        // Insert component in DOM
        document.body.appendChild(element);

        // Validate the modal header to have rendered with correct label
        expect(
            element.shadowRoot.querySelector('lightning-modal-header').label
        ).toBe(
            headerLabel
        );

    });

    it('displays cancel button in footer', () => {
        // Create component and set the content public property
        const element = createElement('c-invoice-generator', {
            is: InvoiceGenerator
        });

        // Insert component in DOM
        document.body.appendChild(element);
        
        // Query cancel button
        const closeButton = element.modalFooter$$('lightning-button')[0];

        // Validate the modal footer to have rendered with close button
        expect(closeButton.label).toBe('Cancel');
    });

    it('displays save button in footer', () => {
        // Create component and set the content public property
        const element = createElement('c-invoice-generator', {
            is: InvoiceGenerator
        });

        // Insert component in DOM
        document.body.appendChild(element);
        
        // Query save button
        const saveButton = element.modalFooter$$('lightning-button')[1];
        // Validate the modal footer to have rendered with save button
        expect(saveButton.label).toBe('Save');
    });
    
});