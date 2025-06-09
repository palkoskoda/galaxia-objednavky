/**
 * Kontroluje, či je možné objednať dané jedlá na určitý dátum.
 * @param {string[]} menuOptions - Pole písmen menu, napr. ['A', 'D']
 * @param {string} orderDateString - Dátum objednávky vo formáte 'YYYY-MM-DD'
 * @returns {{canModify: boolean, reason?: string}} - Objekt s výsledkom kontroly.
 */
export function checkDeadlines(menuOptions: string[], orderDateString: string) {
    const now = new Date();
    const orderDate = new Date(orderDateString);

    for (const option of menuOptions) {
        if (['A', 'B', 'C'].includes(option)) {
            const deadlineABC = new Date(orderDate);
            deadlineABC.setDate(deadlineABC.getDate() - 1); // Deň predtým
            deadlineABC.setHours(14, 30, 0, 0); // 14:30:00

            if (now > deadlineABC) {
                return {
                    canModify: false,
                    reason: `Uzávierka pre Menu ${option} bola ${deadlineABC.toLocaleString('sk-SK')}. Objednávka už nie je možná.`
                };
            }
        }

        if (option === 'D') {
            const deadlineD = new Date(orderDate);
            deadlineD.setHours(8, 0, 0, 0); // 8:00:00 v deň objednávky

            if (now > deadlineD) {
                return {
                    canModify: false,
                    reason: `Uzávierka pre Menu D bola dnes o 8:00. Objednávka už nie je možná.`
                };
            }
        }
    }

    return { canModify: true };
}