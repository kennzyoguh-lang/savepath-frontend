import { CELO_SEPOLIA } from '../lib/config'
import { addressLink } from '../lib/savingsContract'

const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`

export default function WalletBar({ wallet }) {
  const { status, address, wrongNetwork, error } = wallet
  return (
    <div className="walletbar">
      {status === 'connected' ? (
        <>
          <span className={wrongNetwork ? 'pill warn' : 'pill ok'}>{wrongNetwork ? 'Wrong network' : CELO_SEPOLIA.chainName}</span>
          <a href={addressLink(address)} target="_blank" rel="noreferrer" className="addr">{short(address)}</a>
          {wrongNetwork && <button onClick={wallet.switchNetwork}>Switch to Celo Sepolia</button>}
          <button className="ghost" onClick={wallet.disconnect}>Disconnect</button>
        </>
      ) : (
        <>
          <button disabled={status === 'connecting'} onClick={() => wallet.connect('injected')}>{status === 'connecting' ? 'Connecting…' : 'Connect MetaMask'}</button>
          <button className="ghost" disabled={status === 'connecting'} onClick={() => wallet.connect('walletconnect')}>WalletConnect</button>
        </>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  )
}
