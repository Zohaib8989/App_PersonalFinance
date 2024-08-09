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
    const kpiIncome = document.getElementById('kpi-income');
    const kpiExpenses = document.getElementById('kpi-expenses');
    const kpiNetIncome = document.getElementById('kpi-net-income');
    const kpiNetMargin = document.getElementById('kpi-net-margin');
    const reportBody = document.getElementById('report-body');

    let currentSelect = null;
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let monthlyIncomeExpenseChart, expenseByCategoryChart, netMarginChart;

    function updateKPI() {
        const income = transactions
            .filter(transaction => transaction.type === 'income')
            .reduce((sum, transaction) => sum + transaction.amount, 0);

        const expenses = transactions
            .filter(transaction => transaction.type === 'expense')
            .reduce((sum, transaction) => sum + transaction.amount, 0);

        const netIncome = income - expenses;
        const netMargin = income === 0 ? 0 : (netIncome / income) * 100;

        kpiIncome.textContent = `$${income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        kpiExpenses.textContent = `$${expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        kpiNetIncome.textContent = `$${netIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        kpiNetMargin.textContent = `${netMargin.toFixed(2)}%`;
    }

    function updateProfitAndLossReport() {
        const incomeTransactions = transactions.filter(transaction => transaction.type === 'income');
        const expenseTransactions = transactions.filter(transaction => transaction.type === 'expense');

        const incomeCategories = {};
        incomeTransactions.forEach(transaction => {
            if (!incomeCategories[transaction.category]) {
                incomeCategories[transaction.category] = 0;
            }
            incomeCategories[transaction.category] += transaction.amount;
        });

        const expenseCategories = {};
        expenseTransactions.forEach(transaction => {
            if (!expenseCategories[transaction.category]) {
                expenseCategories[transaction.category] = 0;
            }
            expenseCategories[transaction.category] += transaction.amount;
        });

        let reportHtml = '';

        reportHtml += '<tr><th colspan="3">Income</th></tr>';
        for (const [category, amount] of Object.entries(incomeCategories)) {
            reportHtml += `<tr><td>Income</td><td>${category}</td><td>${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;
        }
        const totalIncome = Object.values(incomeCategories).reduce((a, b) => a + b, 0);
        reportHtml += `<tr class="report-total"><td>Total Income</td><td></td><td>${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;

        reportHtml += '<tr><th colspan="3">Expenses</th></tr>';
        for (const [category, amount] of Object.entries(expenseCategories)) {
            reportHtml += `<tr><td>Expense</td><td>${category}</td><td>${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;
        }
        const totalExpenses = Object.values(expenseCategories).reduce((a, b) => a + b, 0);
        reportHtml += `<tr class="report-total"><td>Total Expenses</td><td></td><td>${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;

        const netIncome = totalIncome - totalExpenses;
        const netMargin = totalIncome === 0 ? 0 : (netIncome / totalIncome) * 100;
        reportHtml += `<tr class="report-total"><td>Net Income</td><td></td><td>${netIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;
        reportHtml += `<tr class="report-total"><td>Net Margin</td><td></td><td>${netMargin.toFixed(2)}%</td></tr>`;

        reportBody.innerHTML = reportHtml;
    }

    function updateSelectOptions(select, options) {
        options.sort((a, b) => a.localeCompare(b));
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

    function filterOptions(selectId) {
        const select = document.getElementById(selectId);
        const searchInput = select.previousElementSibling;
        const filter = searchInput.value.toLowerCase();
        const options = select.options;
        for (let i = 0; i < options.length; i++) {
            const text = options[i].textContent.toLowerCase();
            options[i].style.display = text.includes(filter) ? '' : 'none';
        }
    }

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

            // Update the page title on each tab switch
            const pageTitle = document.getElementById('page-title');
            pageTitle.textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
        });
    });

    // Show the form when the New Transaction button is clicked
    newTransactionButton.addEventListener('click', () => {
        transactionForm.style.display = 'block';
    });

    // Handle gear icon dropdown
    document.getElementById('gear-icon').addEventListener('click', () => {
        const dropdown = document.getElementById('gear-dropdown');
        dropdown.style.display = dropdown.style.display === 'none' || !dropdown.style.display ? 'block' : 'none';
    });

    // Populate the table with existing transactions
    transactions.forEach(addTransactionToTable);
    updateAccountFilter();
    updateSelectOptions(payeeSelect, getUniqueValues('payee'));
    updateSelectOptions(categorySelect, getUniqueValues('category'));
    updateSelectOptions(subcategorySelect, getUniqueValues('subcategory'));
    updateSelectOptions(accountSelect, getUniqueValues('account'));
    updateCharts();
    updateKPI();
    updateProfitAndLossReport();

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
        updateKPI();
        updateProfitAndLossReport();

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
        csvFileInput.click();
    });

    csvFileInput.addEventListener('change', () => {
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
        updateKPI();
        updateProfitAndLossReport();
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
        updateKPI();
        updateProfitAndLossReport();
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
                        backgroundColor: '#129ACA',
                        barPercentage: 0.5,
                        categoryPercentage: 0.5
                    },
                    {
                        label: 'Expenses',
                        data: monthlyData.expenses,
                        backgroundColor: '#FF6D6D',
                        barPercentage: 0.5,
                        categoryPercentage: 0.5
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: false,
                            text: 'Month'
                        }
                    },
                    y: {
                        title: {
                            display: false,
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
                    backgroundColor: '#FF6D6D',
                    barPercentage: 0.5,
                    categoryPercentage: 0.5
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                scales: {
                    x: {
                        title: {
                            display: false,
                            text: 'Amount'
                        },
                        beginAtZero: true
                    },
                    y: {
                        title: {
                            display: false,
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
                        backgroundColor: '#129ACA',
                        barPercentage: 0.5,
                        categoryPercentage: 0.5
                    },
                    {
                        label: 'Expenses',
                        data: netMarginData.expenses,
                        backgroundColor: '#FF6D6D',
                        barPercentage: 0.5,
                        categoryPercentage: 0.5
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: false,
                            text: 'Month'
                        }
                    },
                    y: {
                        title: {
                            display: false,
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
