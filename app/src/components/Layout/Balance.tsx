import AccountBalance from './AccountBalance';

function Balance() {
    return (
        <h2 className="mb-0">
            Mi cartera: $<AccountBalance />
        </h2>
    );
}
export default Balance;
