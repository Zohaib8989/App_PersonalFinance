document.addEventListener('DOMContentLoaded', function() {
    const navButtons = document.querySelectorAll('.nav-button');
    const tabContents = document.querySelectorAll('.tab');
    const transactionForm = document.getElementById('transaction-form');
    const transactionsTable = document.getElementById('transactions-table').getElementsByTagName('tbody')[0];
    const csvFileInput = document.getElementById('csvFileInput');
    const uploadCsvButton = document.getElementById('uploadCsvButton');
    const newTransactionButton = document.getElementById('newTransactionButton');
    const accountFilter = document.getElementById('accountFilter');
    const payeeSelect = document.getElementById('payee');
    const categorySelect = document.getElementById('category');
    const subcategorySelect = document.getElementById('subcategory');
    const accountSelect = document.getElementById('account');
    const modal = document.getElementById('modal');
    const newEntryInput = document.getElementById('newEntry');
    const addNewEntryButton = document.getElementById('addNewEntryButton');
    const closeModalButton = document.getElementById('closeModalButton');

    let currentSelect = null;
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let monthlyIncomeExpenseChart, expenseByCategoryChart, netMarginChart;

    function updateSelectOptions(select, options) {
        select.innerHTML = '';
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            select.appendChild(opt);
        });
        const addOption = document.createElement('option');
        addOption.value = 'new';
        addOption.textContent = 'Add New';
        select.appendChild(addOption);
    }

    function handleSelectChange(event) {
        if (event.target.value === 'new') {
            currentSelect = event.target;
            modal.style.display = 'flex';
        }
    }

    addNewEntryButton.addEventListener('click', () => {
        const newValue = newEntryInput.value.trim();
        if (newValue && currentSelect) {
            const newOption = document.createElement('option');
            newOption.value = newValue;
            newOption.textContent = newValue;
            currentSelect.insertBefore(newOption, currentSelect.querySelector('option[value="new"]'));
            currentSelect.value = newValue;
            newEntryInput.value = '';
            modal.style.display = 'none';
        }
    });

    closeModalButton.addEventListener('click', () => {
        newEntryInput.value = '';
        modal.style.display = 'none';
    });

    // Handle tab switching
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const tabId = button.getAttribute('data-tab');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Show the form when the New Transaction button is clicked
    newTransactionButton.addEventListener('click', () => {
        transactionForm.style.display = 'block';
    });

    // Populate the table with existing transactions
    transactions.forEach(addTransactionToTable);
    updateAccountFilter();
    updateSelectOptions(payeeSelect, getUniqueValues('payee'));
    updateSelectOptions(categorySelect, getUniqueValues('category'));
    updateSelectOptions(subcategorySelect, getUniqueValues('subcategory'));
    updateSelectOptions(accountSelect, getUniqueValues('account'));
    updateCharts();

    transactionForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const type = document.getElementById('type').value;
        const date = document.getElementById('date').value;
        const payee = document.getElementById('payee').value;
        const category = document.getElementById('category').value;
        const subcategory = document.getElementById('subcategory').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const account = document.getElementById('account').value;
        const description = document.getElementById('description').value;

        if (!type || !date || !payee || !category || !subcategory || isNaN(amount) || !account) {
            console.error('One or more fields are empty or invalid.');
            return;
        }

        const transaction = { id: Date.now(), type, date, payee, category, subcategory, amount, account, description };

        transactions.push(transaction);
        localStorage.setItem('transactions', JSON.stringify(transactions));

        addTransactionToTable(transaction);
        updateAccountFilter();
        updateSelectOptions(payeeSelect, getUniqueValues('payee'));
        updateSelectOptions(categorySelect, getUniqueValues('category'));
        updateSelectOptions(subcategorySelect, getUniqueValues('subcategory'));
        updateSelectOptions(accountSelect, getUniqueValues('account'));
        updateCharts();

        // Reset the form fields and hide the form
        transactionForm.reset();
        transactionForm.style.display = 'none';

        // Keep focus on the Transactions tab
        navButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector('.nav-button[data-tab="transactions"]').classList.add('active');
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById('transactions').classList.add('active');
    });

    accountFilter.addEventListener('change', function() {
        filterTransactionsByAccount();
    });

    uploadCsvButton.addEventListener('click', () => {
        const file = csvFileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const text = e.target.result;
                parseCsv(text);
            };
            reader.readAsText(file);
        }
    });

    function parseCsv(text) {
        const rows = text.split('\n');
        rows.forEach(row => {
            const columns = row.split(',');
            if (columns.length >= 8) {
                const [type, date, payee, category, subcategory, amount, account, description] = columns;
                const transaction = {
                    id: Date.now(),
                    type: type.trim(),
                    date: date.trim(),
                    payee: payee.trim(),
                    category: category.trim(),
                    subcategory: subcategory.trim(),
                    amount: parseFloat(amount.trim()),
                    account: account.trim(),
                    description: description.trim()
                };
                if (transaction.type && transaction.date && transaction.payee && transaction.category && !isNaN(transaction.amount) && transaction.account) {
                    transactions.push(transaction);
                    addTransactionToTable(transaction);
                }
            }
        });
        console.log('Transactions after CSV import:', transactions); // Debugging log
        localStorage.setItem('transactions', JSON.stringify(transactions));
        updateAccountFilter();
        updateSelectOptions(payeeSelect, getUniqueValues('payee'));
        updateSelectOptions(categorySelect, getUniqueValues('category'));
        updateSelectOptions(subcategorySelect, getUniqueValues('subcategory'));
        updateSelectOptions(accountSelect, getUniqueValues('account'));
        updateCharts();
    }

    function addTransactionToTable(transaction) {
        console.log('Adding transaction to table:', transaction); // Debugging log
        const newRow = transactionsTable.insertRow();
        newRow.dataset.id = transaction.id;

        newRow.insertCell(0).textContent = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
        newRow.insertCell(1).textContent = formatDate(transaction.date);
        newRow.insertCell(2).textContent = transaction.payee;
        newRow.insertCell(3).textContent = transaction.category;
        newRow.insertCell(4).textContent = transaction.subcategory;
        newRow.insertCell(5).textContent = formatAmount(transaction.amount);
        newRow.insertCell(6).textContent = transaction.account;
        newRow.insertCell(7).textContent = transaction.description;
        const deleteCell = newRow.insertCell(8);
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '🗑️';
        deleteButton.addEventListener('click', () => deleteTransaction(transaction.id));
        deleteCell.appendChild(deleteButton);
    }

    function deleteTransaction(id) {
        transactions = transactions.filter(transaction => transaction.id !== id);
        localStorage.setItem('transactions', JSON.stringify(transactions));
        const rowToDelete = transactionsTable.querySelector(`tr[data-id='${id}']`);
        rowToDelete.remove();
        updateCharts();
    }

    function updateCharts() {
        console.log('Updating charts with transactions:', transactions); // Debugging log

        if (transactions.length === 0) {
            if (monthlyIncomeExpenseChart) {
                monthlyIncomeExpenseChart.destroy();
                monthlyIncomeExpenseChart = null;
            }
            if (expenseByCategoryChart) {
                expenseByCategoryChart.destroy();
                expenseByCategoryChart = null;
            }
            if (netMarginChart) {
                netMarginChart.destroy();
                netMarginChart = null;
            }
            return;
        }

        const monthlyData = getMonthlyData(transactions);
        const expenseByCategoryData = getExpenseByCategoryData(transactions);
        const netMarginData = getNetMarginData(monthlyData);

        console.log('Monthly data for chart:', monthlyData); // Debugging log
        console.log('Expense by category data for chart:', expenseByCategoryData); // Debugging log
        console.log('Net margin data for chart:', netMarginData); // Debugging log

        const ctx2 = document.getElementById('monthlyIncomeExpenseChart').getContext('2d');
        if (monthlyIncomeExpenseChart) {
            monthlyIncomeExpenseChart.destroy();
        }
        monthlyIncomeExpenseChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [
                    {
                        label: 'Income',
                        data: monthlyData.income,
                        backgroundColor: '#4caf50'
                    },
                    {
                        label: 'Expenses',
                        data: monthlyData.expenses,
                        backgroundColor: '#f44336'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Month'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Amount'
                        },
                        beginAtZero: true
                    }
                }
            }
        });

        const ctx3 = document.getElementById('expenseByCategoryChart').getContext('2d');
        if (expenseByCategoryChart) {
            expenseByCategoryChart.destroy();
        }
        expenseByCategoryChart = new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: expenseByCategoryData.labels,
                datasets: [{
                    label: 'Expenses by Category',
                    data: expenseByCategoryData.data,
                    backgroundColor: '#f44336'
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Amount'
                        },
                        beginAtZero: true
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Category'
                        }
                    }
                }
            }
        });

        const ctx4 = document.getElementById('netMarginChart').getContext('2d');
        if (netMarginChart) {
            netMarginChart.destroy();
        }
        netMarginChart = new Chart(ctx4, {
            type: 'bar',
            data: {
                labels: netMarginData.labels,
                datasets: [
                    {
                        label: 'Net Margin',
                        data: netMarginData.netMargin,
                        backgroundColor: '#4caf50'
                    },
                    {
                        label: 'Expenses',
                        data: netMarginData.expenses,
                        backgroundColor: '#f44336'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Month'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Percentage'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function updateAccountFilter() {
        const accounts = [...new Set(transactions.map(transaction => transaction.account))];
        accountFilter.innerHTML = '<option value="all">All</option>';
        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account;
            option.textContent = account;
            accountFilter.appendChild(option);
        });
    }

    function filterTransactionsByAccount() {
        const selectedAccount = accountFilter.value;
        const filteredTransactions = selectedAccount === 'all' ? transactions : transactions.filter(transaction => transaction.account === selectedAccount);
        transactionsTable.innerHTML = '';
        filteredTransactions.forEach(addTransactionToTable);
    }

    function getUniqueValues(key) {
        return [...new Set(transactions.map(transaction => transaction[key]))];
    }

    function formatAmount(amount) {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('en-GB', options).replace(/ /g, '-');
    }

    function getMonthlyData(transactions) {
        const monthlyData = {};
        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const month = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expenses: 0 };
            }
            if (transaction.type === 'income') {
                monthlyData[month].income += transaction.amount;
            } else if (transaction.type === 'expense') {
                monthlyData[month].expenses += transaction.amount;
            }
        });

        const labels = Object.keys(monthlyData).sort((a, b) => new Date(a) - new Date(b));
        const income = labels.map(month => monthlyData[month].income);
        const expenses = labels.map(month => monthlyData[month].expenses);

        console.log('Formatted monthly data:', { labels, income, expenses }); // Debugging log

        return { labels, income, expenses };
    }

    function getExpenseByCategoryData(transactions) {
        const categoryData = {};
        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                if (!categoryData[transaction.category]) {
                    categoryData[transaction.category] = 0;
                }
                categoryData[transaction.category] += transaction.amount;
            }
        });

        const sortedCategoryData = Object.entries(categoryData).sort((a, b) => b[1] - a[1]);
        const labels = sortedCategoryData.map(entry => entry[0]);
        const data = sortedCategoryData.map(entry => entry[1]);

        console.log('Formatted expense by category data:', { labels, data }); // Debugging log

        return { labels, data };
    }

    function getNetMarginData(monthlyData) {
        const labels = monthlyData.labels;
        const netMargin = monthlyData.income.map((income, index) => {
            const expense = monthlyData.expenses[index];
            return income === 0 ? 0 : (income - expense) / income * 100;
        });
        const expenses = monthlyData.income.map((income, index) => {
            const expense = monthlyData.expenses[index];
            return income === 0 ? 0 : expense / income * 100;
        });

        console.log('Formatted net margin data:', { labels, netMargin, expenses }); // Debugging log

        return { labels, netMargin, expenses };
    }

    payeeSelect.addEventListener('change', handleSelectChange);
    categorySelect.addEventListener('change', handleSelectChange);
    subcategorySelect.addEventListener('change', handleSelectChange);
    accountSelect.addEventListener('change', handleSelectChange);
});
