import { getShowShop } from '@/lib/settings-schema'
import Footer from './Footer'

/** Server component — reads shop visibility from DB and passes it to Footer. */
export default async function FooterWrapper() {
  const showShop = await getShowShop()
  return <Footer showShop={showShop} />
}
