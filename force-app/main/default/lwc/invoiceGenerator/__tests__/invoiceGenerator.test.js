import { createElement } from 'lwc';
import InvoiceGenerator from 'c/invoiceGenerator';
import getOrderItems from '@salesforce/apex/InvoiceGeneratorController.getOrderItems';

// Realistic data with a list of contacts
const mockGetOrderItemsList = require('./data/getOrderItems.json');

// Mock getContactList Apex wire adapter
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

// Mock updateContacts
jest.mock(
    '@salesforce/apex/ContactController.updateContacts',
    () => {
        return {
            default: jest.fn(() => Promise.resolve())
        };
    },
    { virtual: true }
);

// Mock refreshApex module
jest.mock(
    '@salesforce/apex',
    () => {
        return {
            refreshApex: jest.fn(() => Promise.resolve())
        };
    },
    { virtual: true }
);

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

    it('renders two rows in the lightning datatable', async () => {
        const element = createElement('c-invoice-generator', {
            is: InvoiceGenerator
        });
        document.body.appendChild(element);

        // Emit data from @wire
        getOrderItems.emit(mockGetOrderItemsList);

        // Wait for any asynchronous DOM updates
        await flushPromises();

        const tableEl = element.shadowRoot.querySelector('lightning-datatable');

        // Validate the datatable is populated with correct number of records
        expect(tableEl.data.length).toBe(mockGetOrderItemsList.length);

        // Validate the record to have rendered with correct data
        expect(tableEl.data[0].ProductName).toBe(mockGetOrderItemsList[0].ProductName);
    });


    it('is accessible when data is returned', async () => {
        const element = createElement('c-invoice-generator', {
            is: InvoiceGenerator
        });
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
        document.body.appendChild(element);

        // Emit error from @wire
        getOrderItems.error();

        // Wait for any asynchronous DOM updates
        await flushPromises();

        // Check accessibility
        await expect(element).toBeAccessible();
    });

    it('displays new invoice label in the header', () => {
        // Create component and set the header public property
        const headerLabel = 'New Invoice';
        const element = createElement('c-invoice-generator', {
            is: InvoiceGenerator
        });
        element.header = headerLabel;
        document.body.appendChild(element);

        // Validate the modal header to have rendered with correct label
        expect(
            element.shadowRoot.querySelector('lightning-modal-header').label
        ).toBe(headerLabel);
    });
    
});