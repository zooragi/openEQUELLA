import java.util.Properties
import scala.jdk.CollectionConverters._

case class LangStrings(group: String, xml: Boolean, strings: Map[String, String])

class SortedProperties extends Properties {
  override def keys = super.keys.asScala.toSeq.sortBy(_.toString).toIterator.asJavaEnumeration
}
